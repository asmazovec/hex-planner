/**
 * Annihilator (L1Z1X Mindnet, mech): "While not participating in ground combat, this unit can use its BOMBARDMENT
 * ability on planets in its system as if it were a ship."
 *
 * Decided: a hint at the invasion. Bombardment is a roll of dice the plan does not count.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:l1z1x_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
