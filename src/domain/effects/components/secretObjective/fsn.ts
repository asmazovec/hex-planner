/**
 * Form a Spy Network (secret objective): "Discard 5 action cards."
 *
 * Decided: a `play` of its scoring (pass 2). The plan counts the hand: the 5 discarded cards are named in the `spends`
 * of the status entry that scores it (they leave the hand there, as any discard does), and scoring it with fewer than
 * 5 action cards discarded by that entry is warned of (`objectiveUnmet`, 61.5, step status). The ruling: the cards
 * must be discarded during the status phase; any discarded during the action phase have no effect. Until pass 2 it
 * is the hint every component is by default.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:fsn';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
