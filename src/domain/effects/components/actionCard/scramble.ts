/**
 * Scramble Frequency (action card). "After another player makes a BOMBARDMENT, SPACE CANNON, or ANTI-FIGHTER BARRAGE
 * roll: That player rerolls all of their dice."
 *
 * Decided: a hint in the combat and invasion blocks (the steps its window names: Space Cannon and Anti-Fighter
 * Barrage in the battle in space, Bombardment in the invasion). Dice are not simulated by the plan.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:scramble';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id };
