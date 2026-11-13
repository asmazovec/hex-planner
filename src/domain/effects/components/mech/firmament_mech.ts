/**
 * Viper EX-23 (The Firmament, mech): "When ground forces are committed to this planet, you may choose for your units to
 * coexist, if they were not already. Flip this card if your faction becomes the Obsidian."
 *
 * A hint for the invasion. The plan resolves no ground combat: who is left on a contested planet is entered by the
 * player, and units of two players on one planet are already allowed to stand there, so there is no check to lift.
 * The flip follows a change of faction, which the plan does not model.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:firmament_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
