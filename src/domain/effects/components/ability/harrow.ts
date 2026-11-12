/**
 * Harrow (L1Z1X Mindnet, faction ability): "At the end of each round of ground combat: Your ships in the active
 * system may use their BOMBARDMENT abilities against your opponent's ground forces on the planet."
 *
 * Decided: a hint at the invasion. Bombardment is a roll of dice in ground combat; the plan simulates no combat, so
 * nothing is counted or validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:harrow';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
