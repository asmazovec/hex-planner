/**
 * Revenant (Crimson Rebellion, mech): "DEPLOY: During the "Commit Ground Forces" step of your tactical action in a system
 * that contains an active breach, you may commit 1 mech, even if you have no units in the system."
 *
 * Decided: a reminder of the invasion. The mech deployed would be a landing from the reinforcements, which the landing
 * of a tactical action could hold, but its condition is an active breach in the active system and breaches are not on
 * the plan's board. Only one mech is deployed per tactical action (Revenant note 1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:crimson_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
