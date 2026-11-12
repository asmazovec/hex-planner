/**
 * Dirzuga Rophal (Arborec, commander): "After another player activates a system that contains 1 or more of your units
 * that have PRODUCTION: You may produce 1 unit in that system."
 *
 * A hint. The unit is produced in another player's turn, and the plan has no entry of mine there to hold it (a waiver
 * or a play is asked of the owner of the entry, and the entry is the other player's); the board change is entered by
 * hand. The reminder stands in the production block.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:arboreccommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['production'] };
