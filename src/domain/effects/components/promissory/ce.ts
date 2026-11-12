/**
 * Cybernetic Enhancements (L1Z1X Mindnet, promissory note): "When you gain command tokens during the status phase:
 * Gain 1 additional command token. Then, return this card to the L1Z1X player."
 *
 * Decided: a `play` that changes a number. Named in the `uses` of a status entry, the note raises the tokens gained
 * at 81.5 by one, so the check of the tokens given (`tokensOver`) runs against three; the replay already returns the
 * note to the L1Z1X player (69.3). Pass 2 asks the point `tokensGained` of the status step with the components the
 * entry uses.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:ce';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  modify: { tokensGained: (value, ctx) => (ctx.step === 'status' ? value + 1 : value) },
};
