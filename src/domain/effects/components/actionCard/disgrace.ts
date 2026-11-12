/**
 * Public Disgrace (action card, When another player chooses a strategy card during the strategy phase): "That player
 * must choose a different strategy card instead, if able."
 *
 * A hint without a step: another player's choice of strategy card in the strategy phase, which the plan does not
 * replay.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:disgrace';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
