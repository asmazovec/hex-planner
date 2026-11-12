/**
 * The Stillness of Stars (Vuil'raith Cabal, agent): "After another player replenishes commodities: You may exhaust
 * this card to convert their commodities to trade goods and capture 1 unit from their reinforcements that has a cost
 * equal to or lower than their commodity value."
 *
 * Decided: hint. Another player's commodities and captured units are not counted; the reminder stands with the
 * strategy card that replenishes (Trade).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:cabalagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
