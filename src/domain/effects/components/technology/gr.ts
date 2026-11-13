/**
 * Genetic Recombination (Mahact, technology):
 * You may exhaust this card before a player casts votes; that player must cast at least 1 vote for an outcome of
 * your choice or remove 1 token from their fleet pool and return it to their reinforcements.
 *
 * A hint: votes are not counted, and the token removed from a fleet pool is the other player's choice.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:gr';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
