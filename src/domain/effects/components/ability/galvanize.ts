/**
 * Galvanize (Last Bastion, faction ability): "Galvanized units roll 1 additional die for combat rolls and unit
 * abilities. When a game effect instructs a player to galvanize a unit: they place a galvanize token beneath it if it
 * does not have one."
 *
 * A hint. Dice and galvanize tokens are not counted by the plan (no combat is simulated), so nothing is validated or
 * lifted. The reminder stands in the battle in space and in the invasion (ground combat, Bombardment).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:galvanize';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
