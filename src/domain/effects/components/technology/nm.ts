/**
 * Neural Motivator: "During the status phase, draw 2 action cards instead of 1."
 *
 * A hint at the status phase. The plan does not draw action cards by itself: the card drawn in step 81.3 is entered
 * by hand in «Taken and discarded» of the status entry, and nothing checks how many are drawn, so there is no check to
 * lift and no number to change. The reminder stands in the block of the status phase.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:nm';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
