/**
 * What follows an entry for its owner, once its own steps and its gains are done: the limits of the hand and of the
 * secret objectives (LRR 2.4, 61.21), which the components change through the `handLimit` and `secretLimit` points.
 * The hooks of the components it gained or lost and the checks the components in force add run on the kernel (`game/resolve/entryHooks.ts`).
 */
import { appliedFor } from '../effects/entryApply';
import { holderOf, type Holder } from '../effects/registry';
import handOverLimit from '../rules/codes/handOverLimit';
import secretsOverLimit from '../rules/codes/secretsOverLimit';
import { violation } from '../rules/registry';
import type { DataPack, Entry, Game, GameState, Warning } from '../types';
import type { CardRound } from './cards/index';

/** The hand limit of the rules (LRR 2.4) and the secret objective limit (61.21). */
export const HAND_LIMIT = 7;
export const SECRET_LIMIT = 3;

/** What an entry chose for the components it plays, by the names their effects ask for: a component's `choices`, an agenda's outcome and election. */
export const choicesOf = (entry: Entry): Record<string, string | number> =>
  ('choices' in entry ? entry.choices : undefined) ?? {};

export interface AfterEntry {
  game: Game;
  /** The owner's state after the entry. */
  state: GameState;
  /** My state. */
  shared: GameState;
  /** The owner's state before the entry, for who holds what ready. */
  before?: GameState;
  entry: Entry;
  pack: DataPack;
  cards?: CardRound;
  warnings: Warning[];
  /** Every player's state by `me` or opponent id; the owner's alone when not given. */
  states?: Record<string, GameState>;
}

/** The limits of the hand and of the secret objectives, asked once the entry has gained what it gains. */
export function entryLimits(a: AfterEntry): Warning[] {
  return entryLimitsOf(holderOf(a.game, a.state, a.shared), a.game.faction, a.entry, a.pack, a.before);
}

/** The same for a holder: what they hold after the entry, the faction they play. */
export function entryLimitsOf(holder: Holder, faction: string, entry: Entry, pack: DataPack, before?: GameState): Warning[] {
  const { holdings } = holder;
  const warnings: Warning[] = [];
  // The hand grew: no more action cards than the limit (2.4, 2.4.1).
  if ((entry.gains ?? []).some(id => id.startsWith('actionCard:'))) {
    const limit = appliedFor(pack, holder, entry, 'handLimit', HAND_LIMIT, { faction }, before).value;
    if (holdings.hand.length > limit) warnings.push(violation(handOverLimit.code, { cards: holdings.hand.length, limit }));
  }
  // A secret objective was drawn: no more than the limit, scored and unscored together (61.21).
  if ((entry.gains ?? []).some(id => id.startsWith('secretObjective:'))) {
    const limit = appliedFor(pack, holder, entry, 'secretLimit', SECRET_LIMIT, { faction }, before).value;
    const secrets = holdings.secrets.length + holdings.scored.filter(id => id.startsWith('secretObjective:')).length;
    if (secrets > limit) warnings.push(violation(secretsOverLimit.code, { secrets, limit }));
  }
  return warnings;
}
