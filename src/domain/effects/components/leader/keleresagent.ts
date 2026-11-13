/**
 * "At any time: You may exhaust this card to allow any player to spend commodities as if they were trade goods."
 *
 * Play, named in `uses`: it spends the commodities for the trade goods the payment lacked, and lifts shortTradeGoods
 * while the payment fits in the trade goods and commodities held (21.7 otherwise forbids spending commodities).
 * A payment beyond both stays warned of, and an agent already exhausted lifts nothing: the waiver is narrowed to
 * the warnings the commodities cover while the agent is ready.
 */
import { commoditiesForShortfall } from '../../../replay/payment';
import { coverOf } from '../../shortfall';
import type { ComponentEffect } from '../../types';

export const id = 'leader:keleresagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => void commoditiesForShortfall(turn),
  waive: [{
    code: 'shortTradeGoods',
    rule: 'allow any player to spend commodities as if they were trade goods',
    when: (w, ctx) => ctx.before.holdings.leaders[id] === 'unlocked'
      && Number(w.params.needed) <= Number(w.params.have) + ctx.before.commodities,
  }, {
    // The commodities spent as trade goods count as paid, so what they cover of a resource shortfall is none.
    code: 'shortResources',
    rule: 'allow any player to spend commodities as if they were trade goods',
    when: (w, ctx) => ctx.before.holdings.leaders[id] === 'unlocked' && Number(w.params.needed) - Number(w.params.paid) <= coverOf(ctx),
  }],
};
