/**
 * Valkyrie Particle Weave (Sardakk N'orr, faction technology): "After making combat rolls during a round of ground
 * combat, if your opponent produced 1 or more hits, you produce 1 additional hit."
 *
 * A hint in the block of the invasion, where ground combat is fought. Hits are dice, and the plan simulates no combat.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:vpw';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
