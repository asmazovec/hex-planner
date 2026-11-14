/** The status phase (LRR 81): tokens gained and redistributed, points scored, then the board cleared and every card readied. */
import { appliedFor } from '../effects/entryApply';
import { holderOf, type Holder } from '../effects/registry';
import { violation } from '../rules/registry';
import { STATUS_TOKENS } from '../strategy';
import type { DataPack, Entry, Game, GameState, RuleStep, Warning } from '../types';

/** The command tokens of a faction (LRR 20.3, 23.2): those not in the pools or on the board are in reinforcements. */
export const TOKEN_LIMIT = 16;


/** Check: no more tokens gained than the step or card gives. */
export function checkTokensGiven(given: number, free: number, step?: RuleStep): Warning[] {
  return given > free ? [violation('tokensOver', { given, free }, step)] : [];
}

/**
 * The command tokens a player gains in the status phase (81.5): two, changed by the components in force for them and by
 * those the entry names in `uses` (the `tokensGained` point at the step `status`). `state` is the owner's, `shared` mine.
 */
export function statusTokensFree(game: Game, state: GameState, shared: GameState, entry: Entry, pack: DataPack): number {
  return statusTokensFreeOf(holderOf(game, state, shared), entry, pack);
}

/** The same for a holder: what they hold is what stood before the entry. */
export function statusTokensFreeOf(holder: Holder, entry: Entry, pack: DataPack): number {
  return appliedFor(pack, holder, entry, 'tokensGained', STATUS_TOKENS, { step: 'status' }, holder).value;
}

/** The same for a count of tokens. */
export function tokensOverLimit(total: number, step?: RuleStep): Warning[] {
  return total > TOKEN_LIMIT ? [violation('noReinforcements', { total, limit: TOKEN_LIMIT }, step)] : [];
}
