/**
 * Courageous to the End (action card; "After 1 of your ships is destroyed during a space combat"): "Roll 2 dice. For
 * each result equal to or greater than that ship's combat value, your opponent must choose and destroy 1 of their
 * ships."
 *
 * A hint in the combat block: dice and the opponent's choice. The plan simulates no combat; what is destroyed is
 * entered as losses.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:courageous';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
