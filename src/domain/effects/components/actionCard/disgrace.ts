/**
 * Public Disgrace (action card, When another player chooses a strategy card during the strategy phase): "That player
 * must choose a different strategy card instead, if able."
 *
 * A hint without a step: another player's choice of strategy card in the strategy phase, which the plan does not
 * replay.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:disgrace';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id };
