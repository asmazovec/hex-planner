/**
 * The Crown of Thalnos (agenda):
 * "The elected player gains this card. During each combat round, the owner of this card may reroll any number of
 * dice; they must destroy each of their units that did not produce a hit with its reroll."
 *
 * Hint only, at the combat: rerolls and the units destroyed by them belong to the dice, which the plan
 * does not roll; the losses of a battle are entered by hand (`losses`). Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:crown_of_thalnos';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
