/**
 * Intercept (action card, After your opponent declares a retreat during a space combat): "Your opponent cannot retreat
 * during this round of space combat."
 *
 * A hint at the combat step: retreats are part of the space combat, which the plan does not simulate; whether the
 * opponent retreats is entered by the moves of the next entries.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:intercept';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
