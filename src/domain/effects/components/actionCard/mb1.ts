/**
 * Morale Boost (action card, At the start of a combat round): "Apply +1 to the result of each of your unit's combat
 * rolls during this combat round."
 *
 * A hint at the combat step: a modifier of combat rolls, which the plan does not roll.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:mb1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
