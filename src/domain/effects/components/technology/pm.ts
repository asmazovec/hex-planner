/**
 * Production Biomes (Emirates of Hacan, technology): "ACTION: Exhaust this card and spend 1 token from your strategy
 * pool to gain 4 trade goods and choose 1 other player; that player gains 2 trade goods."
 *
 * Decided: `play`, a component action with the choice `player` (exhausted already, its text says so): one strategy
 * token spent (`shortStrategy` when the pool is empty), 4 trade goods to the Hacan, 2 to the chosen player. Pass 1:
 * still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:pm';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
