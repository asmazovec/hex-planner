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
import { spentOnObjectives } from '../../points/status';
import type { ComponentEffect } from '../../types';

const GOODS = 6;

export const id = 'publicObjective:vast_reserves';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play(turn) {
    // What the entry's own `spend` already paid in trade goods counts; the rest comes from the pool.
    const owed = Math.max(0, GOODS - spentOnObjectives(turn).tradeGoods);
    if (owed > turn.state.tradeGoods) turn.warnings.push(violation('shortTradeGoods', { needed: owed, have: turn.state.tradeGoods }, 'status'));
    turn.state.tradeGoods -= Math.min(owed, turn.state.tradeGoods);
  },
};
