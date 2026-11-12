/**
 * Sorrow (Crimson Rebellion, ability): "When you create the game board, place the Sorrow (tile 94) where your home
 * system would normally be placed, then place a inactive breach there. The Sorrow is not a home system. Then, place
 * your home system (tile 118) in your play area."
 *
 * Decided: a reminder with no step. It speaks of building the map before the game, which the plan does not replay;
 * the map is built on the «Game» screen, and breaches are not on the plan's board.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:sorrow';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
