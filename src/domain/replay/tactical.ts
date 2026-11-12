/**
 * The tactical action (LRR 89) as its steps, in order: 89.1 activation, 89.2 movement (with transport), 89.3 combat,
 * 89.4 invasion, 89.5 production and its payment, then the system's limits. Each step checks the state it is given, then
 * changes it; the steps themselves live in their own modules.
 */
import { checkStationLandings, claimStations } from '../thundersEdge';
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import { activate, checkActivation } from './activation';
import { canFight, checkAfterCombat, checkArrival, removeGroundLosses, removeLosses } from './combat';
import { gainControl, landUnits } from './invasion';
import { checkRoutes, moveUnits } from './movement';
import { checkProduction, payProduction, placeProduction, placesOf, producerList, type ProductionPlace } from './production';
import { take, unitIds, type TacticalEntry } from './state';
import { carryStructures, placeCarried } from './structures';
import { capacity, checkGroups, checkLeftBehind, checkPickups, checkSystem, dockFighterRoom, fleetCount, fleetLimit, isPickup, overflowLeft, removeFleetExcess } from './transport';
import type { Blockers } from '../movement';

/** Step 89.2: the routes and pickups are checked over the state before the move, then the units are carried and what stays behind is checked; returns each source's group. */
function movement(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], blockers?: Blockers): Record<string, UnitCounts> {
  warnings.push(...checkRoutes(game, state, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack, blockers));
  warnings.push(...checkPickups(game, state, target, entry.moves, pack, blockers));
  const over = overflowLeft(game, state, target, entry.moves, pack);
  const groups = moveUnits(game, state, target, entry.moves, pack, warnings);
  carryStructures(game, state, target, entry.moves, pack, warnings);
  warnings.push(...checkLeftBehind(game, state, over, target, entry.moves, pack));
  return groups;
}

/**
 * Steps 89.3 and 89.4 in the target after the moves: the battle's losses, the landing, the losses on the planets, then
 * control of the planets still held. What the surviving ships cannot carry is checked between the two (16.3.3).
 */
function fightAndLand(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], lossesTaken = false,
): void {
  if (!lossesTaken) removeLosses(state, target, entry, warnings);
  warnings.push(...checkAfterCombat(game, state, target, entry, pack));
  warnings.push(...checkStationLandings(entry, pack));
  const landedOn = landUnits(game, state, target, entry, pack, warnings);
  removeGroundLosses(state, entry, warnings);
  gainControl(state, landedOn, pack);
}

/**
 * What happens in the target after the moves: the battle and the landing, then what was built is placed. `removeLater`
 * is what the player removes beyond the fleet pool of what the production builds (37 note 2).
 */
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], lossesTaken = false,
  removeLater: UnitCounts = {},
): boolean {
  fightAndLand(game, state, target, entry, pack, warnings, lossesTaken);
  warnings.push(...checkProduction(game, state, target, entry.production, pack, entry.productionGround, 'system', undefined, entry));
  // Whether a unit used PRODUCTION (Sarween Tools asks): the producers stand before the built units do.
  const producing = producerList(game, state, target, pack).length > 0;
  placeProduction(game, state, target, entry.production, pack, entry.productionGround);
  take(state.systems, target, removeLater, warnings, 'production');
  claimStations(game, state, target, pack);
  return producing;
}

/** A warning of the final check that the action already gave for the same system, at arrival or after the battle, is not repeated. */
const fresh = (found: Warning[], given: Warning[]): Warning[] =>
  found.filter(w => !given.some(g => g.code === w.code && g.params.systemId === w.params.systemId));

export function applyTactical(
  game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[], blockers?: Blockers,
): void {
  const target = entry.systemId;
  if (target === null) return;
  warnings.push(...checkActivation(state, target, entry));
  activate(state, target, entry);
  const groups = movement(game, state, target, entry, pack, warnings, blockers);
  warnings.push(...checkGroups(game, state, groups, pack));
  // Ships lost where nothing could fight them were lost on the way, before the fleet pool counts the arrival.
  const onTheWay = !canFight(game, state, target, pack);
  if (onTheWay) removeLosses(state, target, entry, warnings);
  // The excess beyond the fleet pool goes at once (37.3), so the arrival counts what is left.
  const removeLater = removeFleetExcess(state, target, entry.fleetRemovals ?? {});
  if (entry.moves.length > 0) warnings.push(...checkArrival(game, state, target, entry, pack));
  const producing = landAndBuild(game, state, target, entry, pack, warnings, onTheWay, removeLater);
  payProduction(game, state, entry, pack, warnings, producing);
  // The structures a flight brought are put on planets when the action ends, after its production.
  placeCarried(game, state, target, entry.landings, pack, warnings);
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) warnings.push(...fresh(checkSystem(game, state, target, pack), warnings));
}

/** The numbers behind `capacityGroup` and `fleetPool`, for the source being edited. */
export function tacticalMeters(
  game: Game, entry: TacticalEntry, source: string, before: GameState, pack: DataPack,
): { group: { load: number; capacity: number }; ships: number; fleet: number } {
  const state = structuredClone(before);
  const target = entry.systemId;
  const groups = target === null ? {} : moveUnits(game, state, target, entry.moves, pack, []);
  if (target !== null) landAndBuild(game, state, target, entry, pack, [], false, removeFleetExcess(state, target, entry.fleetRemovals ?? {}));
  return {
    group: capacity(game, groups[source] ?? {}, before.holdings, pack),
    // A moving group keeps its fighters on board (79 note 2): the docks keep fighters only in the system after the move.
    ships: fleetCount(game, state.systems[target ?? ''] ?? {}, before.holdings, pack, target === null ? 0 : dockFighterRoom(game, state, target, pack)),
    fleet: fleetLimit(game, before, pack),
  };
}

/**
 * How the active system of an action stands against the fleet pool (37.3): its ships, the pool, and how many are still
 * to remove. While the replay warns of the entry, the numbers are those of its warning, the worst one where it warns
 * both on arrival and after the production; with no warning, the ships left at the end of the action and nothing over.
 */
export function fleetExcess(
  game: Game, entry: TacticalEntry, before: GameState, pack: DataPack, warnings: Warning[],
): { ships: number; fleet: number; over: number } {
  const over = warnings.filter(w => w.code === 'fleetPool' && w.params.systemId === entry.systemId)
    .map(w => ({ ships: Number(w.params.ships), fleet: Number(w.params.fleet) }))
    .sort((a, b) => (b.ships - b.fleet) - (a.ships - a.fleet))[0];
  if (over) return { ...over, over: Math.max(0, over.ships - over.fleet) };
  return { ships: tacticalMeters(game, entry, '', before, pack).ships, fleet: fleetLimit(game, before, pack), over: 0 };
}

/** Where a tactical entry's production stands, as the replay places it: after the entry's own moves and landings. */
export function productionPlaces(game: Game, entry: TacticalEntry, before: GameState, pack: DataPack): ProductionPlace[] {
  const target = entry.systemId;
  if (target === null) return [];
  const state = structuredClone(before);
  moveUnits(game, state, target, entry.moves, pack, []);
  fightAndLand(game, state, target, entry, pack, []);
  return placesOf(game, state, target, entry.production, pack, entry.productionGround);
}
