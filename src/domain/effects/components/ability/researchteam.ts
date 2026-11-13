/**
 * "When ground forces are committed: if your units on that planet are not already coexisting, you may choose for
 * your units to coexist."
 *
 * Hint. Coexistence is not modelled: a landing takes the planet, and the choice to coexist instead is the
 * player's.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:researchteam';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
