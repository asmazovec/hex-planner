/**
 * Centralize Galactic Trade (public objective, stage II): "Spend 10 trade goods."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: play: scoring it spends the 10 trade goods (61.10); fewer held is warned
 * of as any short payment (shortTradeGoods, step status).
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { violation } from '../../../rules/registry';

export const id = 'publicObjective:centralize_trade';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const have = ctx.my.tradeGoods;
    if (10 > have) ctx.warn(violation('shortTradeGoods', { needed: 10, have }, 'status'));
    return have > 0 ? [tradeGoods(ctx.holder, -Math.min(10, have))] : [];
  },
};
