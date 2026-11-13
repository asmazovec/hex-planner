/**
 * Fighter Prototype (action card; "At the start of the first round of a space combat"): "Apply +2 to the result of
 * each of your fighters' combat rolls during this combat round."
 *
 * A hint in the combat block: combat rolls, which the plan does not simulate.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:f_prototype';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
