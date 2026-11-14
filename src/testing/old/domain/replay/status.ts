import { holderOf } from '../../../../domain/effects/registry';
import type { DataPack, Entry, Game } from '../../../../domain/types';
import type { GameState } from '../types';
import { statusTokensFreeOf } from '../../../../domain/replay/status';
/**
 * The command tokens a player gains in the status phase (81.5): two, changed by the components in force for them and by
 * those the entry names in `uses` (the `tokensGained` point at the step `status`). `state` is the owner's, `shared` mine.
 */
export function statusTokensFree(game: Game, state: GameState, shared: GameState, entry: Entry, pack: DataPack): number {
  return statusTokensFreeOf(holderOf(game, state, shared), entry, pack);
}
