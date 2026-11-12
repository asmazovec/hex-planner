/**
 * Marionettes (The Obsidian, ability): "The player or players whose control tokens are on each plot card are the
 * puppeted players for that plot."
 *
 * A hint with no step: a definition for the other Obsidian components. Plot cards are not tracked; nothing is counted
 * or lifted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:marionettes';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
