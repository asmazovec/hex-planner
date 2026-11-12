/**
 * Gila the Silvertongue (Emirates of Hacan, commander): "When you cast votes: You may spend any number of trade goods:
 * cast 2 additional votes for each trade good spent."
 *
 * Decided: a `hint`. Votes are cast in the agenda phase, which the plan does not replay; the trade goods spent there
 * are entered by hand. No step of a tactical action or of the round speaks of votes, so it has no `hintAt`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:hacancommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
