/**
 * Xuange (Empyrean, commander):
 * After another player moves ships into a system that contains 1 of your command tokens: You may return that
 * token to your reinforcements.
 *
 * A hint: it reacts to another player's move in that player's turn, which a waiver of one entry does not reach.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:empyreancommander';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id, hintAt: ['movement'] };
