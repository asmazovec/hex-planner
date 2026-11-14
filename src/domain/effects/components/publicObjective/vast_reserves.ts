/**
 * Hold Vast Reserves (public, stage II objective, Prophecy of Kings): "Spend 6 influence, 6 resources, and 6 trade
 * goods."
 *
 * Decided: a `play` of its scoring (pass 2). The plan counts trade goods, so the 6 trade goods spent to score it must
 * leave the pool when a status entry scores it, and too few are warned of (`shortTradeGoods`, 93.4). The ruling lets
 * trade goods stand in for the influence and the resources too, so 6 is the least the scoring always costs; the
 * planets exhausted for the rest are the player's choice and the status entry has no payment, so they are not
 * counted. Until pass 2 it is the hint every component is by default.
 */
import { violation } from '../../../rules/registry';
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

const GOODS = 6;

export const id = 'publicObjective:vast_reserves';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play(ctx) {
    // What the entry's own `spend` already paid in trade goods counts; the rest comes from the pool.
    const { spent, events } = ctx.spendOnObjectives();
    const owed = Math.max(0, GOODS - spent.tradeGoods);
    const have = ctx.after(events).my.tradeGoods;
    if (owed > have) ctx.warn(violation('shortTradeGoods', { needed: owed, have }, 'status'));
    const taken = Math.min(owed, have);
    return taken > 0 ? [...events, tradeGoods(ctx.holder, -taken)] : events;
  },
};
