/**
 * Xuange (Empyrean, commander):
 * After another player moves ships into a system that contains 1 of your command tokens: You may return that
 * token to your reinforcements.
 *
 * A hint: it reacts to another player's move in that player's turn, which a waiver of one entry does not reach.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:empyreancommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
