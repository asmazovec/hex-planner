/**
 * "At any time: You may exhaust this card to allow any player to spend commodities as if they were trade goods."
 *
 * Play, named in `uses`: it spends the commodities for the trade goods the payment lacked, and lifts shortTradeGoods
 * while the payment fits in the trade goods and commodities held (21.7 otherwise forbids spending commodities).
 * A payment beyond both stays warned of, and an agent already exhausted lifts nothing: the waiver is narrowed to
 * the warnings the commodities cover while the agent is ready.
 */
import { coverOf } from '../../shortfall';
import type { ComponentEffect } from '../../types';
import { commodities } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:keleresagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'shortTradeGoods',
    rule: 'allow any player to spend commodities as if they were trade goods',
    when: (w, ctx) => ctx.had.card(id) === 'ready' && Number(w.params.needed) <= Number(w.params.have) + ctx.had.commodities,
  }, {
    // The commodities spent as trade goods count as paid, so what they cover of a resource shortfall is none.
    code: 'shortResources',
    rule: 'allow any player to spend commodities as if they were trade goods',
    when: (w, ctx) => ctx.had.card(id) === 'ready' && Number(w.params.needed) - Number(w.params.paid) <= coverOf(ctx),
  }],
  // Takes from the commodities what the payment lacked in trade goods, as the payment's own warnings say; what they cannot cover stays short.
  play: ctx => {
    const short = ctx.warned
      .filter(w => w.code === 'shortTradeGoods' && w.step === 'payment')
      .reduce((sum, w) => sum + Math.max(0, Number(w.params.needed) - Number(w.params.have)), 0);
    const covered = Math.min(short, ctx.my.commodities);
    return covered > 0 ? [commodities(ctx.holder, -covered)] : [];
  },
};
