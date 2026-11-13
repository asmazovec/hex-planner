/**
 * Dacxive Animators: "After you win a ground combat, you may place 1 infantry from your reinforcements on that planet."
 *
 * A hint at the invasion. The plan simulates no combat, so it never knows that a ground combat was won; the infantry
 * placed is entered by hand like any other gain of units. Nothing is checked, so nothing is lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:dxa';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
