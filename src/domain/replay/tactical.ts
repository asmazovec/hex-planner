/**
 * The tactical action (LRR 89) as its steps, in order: 89.1 activation, 89.2 movement (with transport), 89.3 combat,
 * 89.4 invasion, 89.5 production and its payment, then the system's limits. Each step checks the state it is given, then
 * changes it; the steps themselves live in their own modules.
 */
import type { DataPack, Game, GameState, UnitCounts, Warning } from '../types';
import { activate, checkActivation } from './activation';
import { canFight, checkAfterCombat, checkArrival, removeGroundLosses, removeLosses } from './combat';
import { gainControl, landUnits } from './invasion';
import { checkRoutes, moveUnits } from './movement';
import { payProduction, placeProduction, placesOf, type ProductionPlace } from './production';
import { unitIds, type TacticalEntry } from './state';
import { capacity, checkGroups, checkSystem, fleetCount, isPickup } from './transport';

/** Step 89.2: the routes are checked over the state before the move, then the units are carried; returns each source's group. */
function movement(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): Record<string, UnitCounts> {
  warnings.push(...checkRoutes(game, state, target, entry.moves.filter(move => !isPickup(move, target, pack)), pack));
  return moveUnits(game, state, target, entry.moves, pack, warnings);
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
  const landedOn = landUnits(game, state, target, entry, pack, warnings);
  removeGroundLosses(state, entry, warnings);
  gainControl(state, landedOn, pack);
}

/** What happens in the target after the moves: the battle and the landing, then what was built is placed. */
function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], lossesTaken = false,
): void {
  fightAndLand(game, state, target, entry, pack, warnings, lossesTaken);
  placeProduction(game, state, target, entry.production, pack, entry.productionGround);
}

/** A warning of the final check that the action already gave for the same system, at arrival or after the battle, is not repeated. */
const fresh = (found: Warning[], given: Warning[]): Warning[] =>
  found.filter(w => !given.some(g => g.code === w.code && g.params.systemId === w.params.systemId));

export function applyTactical(
  game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[],
): void {
  const target = entry.systemId;
  if (target === null) return;
  warnings.push(...checkActivation(state, target, entry));
  activate(state, target, entry);
  const groups = movement(game, state, target, entry, pack, warnings);
  warnings.push(...checkGroups(game, state, groups, pack));
  // Ships lost where nothing could fight them were lost on the way, before the fleet pool counts the arrival.
  const onTheWay = !canFight(game, state, target, pack);
  if (onTheWay) removeLosses(state, target, entry, warnings);
  if (entry.moves.length > 0) warnings.push(...checkArrival(game, state, target, entry, pack));
  landAndBuild(game, state, target, entry, pack, warnings, onTheWay);
  payProduction(game, state, entry, pack, warnings);
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) warnings.push(...fresh(checkSystem(game, state, target, pack), warnings));
}

/** The numbers behind `capacityGroup` and `fleetPool`, for the source being edited. */
export function tacticalMeters(
  game: Game, entry: TacticalEntry, source: string, before: GameState, pack: DataPack,
): { group: { load: number; capacity: number }; ships: number; fleet: number } {
  const state = structuredClone(before);
  const target = entry.systemId;
  const groups = target === null ? {} : moveUnits(game, state, target, entry.moves, pack, []);
  if (target !== null) landAndBuild(game, state, target, entry, pack, []);
  return {
    group: capacity(game, groups[source] ?? {}, before.upgrades, pack),
    ships: fleetCount(game, state.systems[target ?? ''] ?? {}, before.upgrades, pack),
    fleet: before.fleet,
  };
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
