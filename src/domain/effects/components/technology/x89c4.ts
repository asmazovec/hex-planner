/**
 * X-89 Bacterial Weapon ΩΩ: "Double the hits produced by your units' BOMBARDMENT and ground combat rolls. Exhaust each
 * planet you use BOMBARDMENT against."
 *
 * A hint at the invasion: hits are dice, and the planet exhausted is the opponent's, which my count does not hold.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:x89c4';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
