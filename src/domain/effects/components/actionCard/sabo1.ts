/**
 * Sabotage (action card, When another player plays an action card other than 'Sabotage'): "Cancel that action card."
 *
 * A hint without a step: it cancels another player's action card, whose entry is then entered without it.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:sabo1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
