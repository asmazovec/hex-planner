/**
 * Plague (action card, Action): "Choose 1 planet that is controlled by another player. Roll 1 die for each infantry on
 * that planet. For each result of 6 or greater, destroy 1 of those units."
 *
 * A hint at the component step: dice decide what is destroyed; the losses are entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:plague';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
