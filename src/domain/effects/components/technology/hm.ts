/**
 * Hyper Metabolism: "During the status phase, gain 3 command tokens instead of 2."
 *
 * Pass 2 makes it a `passive` `modify` of `tokensGained` at the step `status` (+1), and the status step asks that
 * point instead of the fixed STATUS_TOKENS: a fourth token is still warned of, against 3. Today a hint.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:hm';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { tokensGained: (value, ctx) => (ctx.step === 'status' ? value + 1 : value) },
};
