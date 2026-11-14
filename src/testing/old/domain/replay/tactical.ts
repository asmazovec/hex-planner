import type { Game, GameState, DataPack, Warning, UnitCounts } from '../../../../domain/types';
import { type TacticalEntry, unitIds, take } from '../../../../domain/replay/state';
import type { Blockers } from '../../../../domain/movement';
import { checkEntryRoutes } from './movement';
import { checkPickups, overflowLeft, checkLeftBehind, checkGroups, removeFleetExcess } from './transport';
import { moveUnits } from '../../../../domain/replay/movement';
import { carryStructures, placeCarried } from './structures';
import { fightAndLand, fresh } from '../../../../domain/replay/tactical';
import { checkProduction, producerList, placeProduction, payProduction } from './production';
import { violation } from '../../../../domain/rules/registry';
import productionShipsAway from '../../../../domain/rules/codes/productionShipsAway';
import { claimStations } from '../thundersEdge';
import { checkActivation, activate, reactToActivation } from './activation';
import { canFight, checkArrival } from './combat';
import { removeLosses } from '../../../../domain/replay/combat';
import { fire } from '../effects/points/moments';
import { checkSystem } from '../../../../domain/replay/transport';

/** Step 89.2: the routes and pickups are checked over the state before the move, then the units are carried and what stays behind is checked; returns each source's group. */
export function movement(game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], blockers?: Blockers, shared?: GameState): Record<string, UnitCounts> {
  warnings.push(...checkEntryRoutes(game, state, shared, entry, pack, blockers));
  warnings.push(...checkPickups(game, state, target, entry.moves, pack, blockers));
  const over = overflowLeft(game, state, target, entry.moves, pack);
  const groups = moveUnits(game, state, target, entry.moves, pack, warnings);
  carryStructures(game, state, target, entry.moves, pack, warnings);
  warnings.push(...checkLeftBehind(game, state, over, target, entry.moves, pack));
  return groups;
}
/**
 * What happens in the target after the moves: the battle and the landing, then what was built is placed. `removeLater`
 * is what the player removes beyond the fleet pool of what the production builds (37 note 2).
 */
export function landAndBuild(
  game: Game, state: GameState, target: string, entry: TacticalEntry, pack: DataPack, warnings: Warning[], lossesTaken = false,
  removeLater: UnitCounts = {}, shared: GameState = state,
): boolean {
  fightAndLand(game, state, target, entry, pack, warnings, lossesTaken, shared);
  warnings.push(...checkProduction(game, state, target, entry.production, pack, entry.productionGround, 'system', undefined, entry));
  // Whether a unit used PRODUCTION (Sarween Tools asks): the producers stand before the built units do.
  const producing = producerList(game, state, target, pack).length > 0;
  const away = entry.shipsTo !== undefined && entry.shipsTo !== target && game.map[entry.shipsTo] !== undefined ? entry.shipsTo : undefined;
  const ships = Object.fromEntries(unitIds(entry.production).filter(id => !pack.units[id]?.ground).map(id => [id, entry.production[id]])) as UnitCounts;
  if (away && unitIds(ships).length > 0) {
    // 68.2: the ships belong in the active system; they stand where the player placed them, and a component may lift the warning.
    warnings.push(violation(productionShipsAway.code, { systemId: target, to: away }, 'production'));
    const rest = { ...entry.production };
    for (const id of unitIds(ships)) delete rest[id];
    placeProduction(game, state, target, rest, pack, entry.productionGround);
    placeProduction(game, state, away, ships, pack);
  } else placeProduction(game, state, target, entry.production, pack, entry.productionGround);
  take(state.systems, target, removeLater, warnings, 'production');
  claimStations(game, state, target, pack);
  return producing;
}
export function applyTactical(
  game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[], blockers?: Blockers, shared: GameState = state,
): void {
  const target = entry.systemId;
  if (target === null) return;
  warnings.push(...checkActivation(state, target, entry));
  activate(state, target, entry);
  // Whatever answers the activation, and what a component named by the entry plays at it, comes before the move.
  reactToActivation(game, state, shared, entry, target, pack, warnings);
  const groups = movement(game, state, target, entry, pack, warnings, blockers, shared);
  warnings.push(...checkGroups(game, state, groups, pack));
  // Ships lost where nothing could fight them were lost on the way, before the fleet pool counts the arrival.
  const onTheWay = !canFight(game, state, target, pack);
  if (onTheWay) removeLosses(state, target, entry, warnings);
  // The excess beyond the fleet pool goes at once (37.3), so the arrival counts what is left.
  const removeLater = removeFleetExcess(state, target, entry.fleetRemovals ?? {});
  if (entry.moves.length > 0) warnings.push(...checkArrival(game, state, target, entry, pack));
  const producing = landAndBuild(game, state, target, entry, pack, warnings, onTheWay, removeLater, shared);
  payProduction(game, state, entry, pack, warnings, producing);
  // The structures a flight brought are put on planets when the action ends, after its production.
  placeCarried(game, state, target, entry.landings, pack, warnings);
  // What the components in force are told of: a use of PRODUCTION with its units, and the units the action destroyed.
  const at = { game, state, shared, pack, warnings, entry, player: entry.owner ?? 'me' };
  if (producing && unitIds(entry.production).length > 0) fire('onProduced', at, { units: entry.production, systemId: target });
  const losses = [
    ...Object.entries(entry.losses ?? {}).map(([unit, count]) => ({ unit, count: count ?? 0, systemId: target })),
    ...Object.entries(entry.groundLosses ?? {}).flatMap(([planetId, units]) => Object.entries(units).map(([unit, count]) => ({ unit, count: count ?? 0, planetId }))),
  ].filter(loss => loss.count > 0);
  if (losses.length > 0) fire('onDestroyed', at, { losses });
  if (entry.moves.length > 0 || unitIds(entry.production).length > 0) warnings.push(...fresh(checkSystem(game, state, target, pack), warnings));
}
