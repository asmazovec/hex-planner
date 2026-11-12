/**
 * Scheming (Yssaril Tribes): "When you draw 1 or more action cards: Draw 1 additional action card. Then, choose
 * and discard 1 action card from your hand."
 *
 * A hint: the cards drawn and discarded are entered by the player as gains and spends; the plan counts no draws.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:scheming';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status', 'card'],
};
