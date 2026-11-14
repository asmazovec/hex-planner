import type { Game, GameState, DataPack, Warning, UnitCounts } from '../../../../domain/types';
import { type Move, unitIds, take } from '../../../../domain/replay/state';
import { type Blockers } from '../../../../domain/movement';
import { blockersOf } from '../movement';
import { checkPickupsOf, checkGroupsOf, stacksOfState, overflowLeftOf, checkLeftBehindOf } from '../../../../domain/replay/transport';

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
