/**
 * Centralize Galactic Trade (public objective, stage II): "Spend 10 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it spends the 10 trade goods (61.10); fewer held is warned
 * of as any short payment (shortTradeGoods, step status).
 */
import { spendTradeGoods } from '../../../replay/payment';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:centralize_trade';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => spendTradeGoods(turn.state, 10, turn.warnings, 'status'),
};
