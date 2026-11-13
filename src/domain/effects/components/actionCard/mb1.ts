/**
 * Morale Boost (action card, At the start of a combat round): "Apply +1 to the result of each of your unit's combat
 * rolls during this combat round."
 *
 * A hint at the combat step: a modifier of combat rolls, which the plan does not roll.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:mb1';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
