/**
 * Supercharge (Naaz-Rokha Alliance, technology): "At the start of a combat round, you may exhaust this card to apply +1
 * to the result of each of your unit's combat rolls during this combat round."
 *
 * A hint at the combat step: the plan rolls no dice.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:sc';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
