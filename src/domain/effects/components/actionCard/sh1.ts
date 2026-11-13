/**
 * Shields Holding (action card, Before you assign hits to your ships during a space combat): "Cancel up to 2 hits."
 *
 * A hint: cancelling hits belongs to the space combat, whose rolls the plan does not simulate (the losses are entered
 * by hand). Its step, the combat, comes from the card's window.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:sh1';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
