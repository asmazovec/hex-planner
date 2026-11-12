/**
 * Fire Team (action card; "After your ground forces make combat rolls during a round of ground combat"): "Reroll any
 * number of your dice."
 *
 * A hint in the invasion block, where ground combat is fought: dice, which the plan does not roll.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:fire_team';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
