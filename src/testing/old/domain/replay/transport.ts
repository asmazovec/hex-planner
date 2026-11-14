import { holderOf } from '../../../../domain/effects/registry';
import type { DataPack, Game, GameState, Warning, UnitCounts } from '../../../../domain/types';
import { gameAs } from '../../../../domain/players';
import { type Stacks, capacity, checkSystemOf, dockFighterRoom, fleetCount, fleetLimit, checkPickupsOf, checkGroupsOf, overflowLeftOf, checkLeftBehindOf } from '../../../../domain/replay/transport';
import { type Move, unitIds, take } from '../../../../domain/replay/state';
import type { Blockers } from '../../../../domain/movement';
import { blockersOf } from '../movement';
/**
 * Check, after the activation: a ship picks units up only in the system it starts in, one it passes or the active one
 * (95.1), and never where my command token lies other than the active system (95.3).
 */
export function checkPickups(game: Game, state: GameState, target: string, moves: Move[], pack: DataPack, blockers: Blockers = blockersOf(game, null, undefined, pack)): Warning[] {
  return checkPickupsOf(game, slot => state.tokensOnMap.includes(slot), target, moves, pack, blockers);
}
export const checkGroups = (game: Game, state: GameState, groups: Record<string, UnitCounts>, pack: DataPack): Warning[] =>
  checkGroupsOf(stacksOfState(game, state, pack), groups);
export const overflowLeft = (game: Game, state: GameState, target: string, moves: Move[], pack: DataPack): Map<string, number> =>
  overflowLeftOf(stacksOfState(game, state, pack), target, moves, pack);
export const checkLeftBehind = (game: Game, state: GameState, before: Map<string, number>, target: string, moves: Move[], pack: DataPack): Warning[] =>
  checkLeftBehindOf(stacksOfState(game, state, pack), before, target, moves, pack);
/**
 * Effect (37.3, note 2): the ships the player chose to remove beyond the fleet pool leave the active system, as many of
 * each type as stand there now; the rest is returned, to be removed after the production that builds them.
 */
export function removeFleetExcess(state: GameState, target: string, removals: UnitCounts): UnitCounts {
  const here = state.systems[target] ?? {};
  const now: UnitCounts = {};
  const later: UnitCounts = {};
  for (const id of unitIds(removals)) {
    const wanted = removals[id] ?? 0;
    const taken = Math.min(wanted, here[id] ?? 0);
    if (taken > 0) now[id] = taken;
    if (wanted > taken) later[id] = wanted - taken;
  }
  take(state.systems, target, now, []);
  return later;
}

/** The stacks of a player as the old per-player state holds them. */
export const stacksOfState = (game: Game, state: GameState, pack: DataPack): Stacks => ({
  units: slot => state.systems[slot] ?? {},
  capacityOf: (units, slot) => capacity(game, units, holderOf(game, state), pack, slot === null ? 0 : dockFighterRoom(game, state, slot, pack)),
  fleetOf: (units, slot) => fleetCount(game, units, holderOf(game, state), pack, slot === null ? 0 : dockFighterRoom(game, state, slot, pack)),
  fleet: () => fleetLimit(game, state, pack),
});

/**
 * What the board itself breaks in a system, apart from any entry: each player's capacity and fleet pool there (16.3,
 * 37.1), as units placed by hand leave them. A big hex placing by hand checks this; it forbids nothing.
 */
export function boardSystemWarnings(game: Game, state: GameState, slot: string, pack: DataPack): Warning[] {
  const players: [Game, GameState][] = [[game, state], ...Object.entries(state.rivals ?? {}).map(([id, held]): [Game, GameState] => [gameAs(game, id), held])];
  return players.flatMap(([view, held]) => checkSystem(view, held, slot, pack));
}

export const checkSystem = (game: Game, state: GameState, target: string, pack: DataPack): Warning[] =>
  checkSystemOf(stacksOfState(game, state, pack), target);
