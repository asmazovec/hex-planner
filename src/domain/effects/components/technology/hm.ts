/**
 * Hyper Metabolism: "During the status phase, gain 3 command tokens instead of 2."
 *
 * Pass 2 makes it a `passive` `modify` of `tokensGained` at the step `status` (+1), and the status step asks that
 * point instead of the fixed STATUS_TOKENS: a fourth token is still warned of, against 3. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:hm';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
