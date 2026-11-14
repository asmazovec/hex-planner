/**
 * Merchant Station (frontier exploration): "You may replenish your commodities, or you may convert your commodities
 * to trade goods."
 *
 * To be a `play` effect: the plan counts commodities and trade goods. The entry that explores the frontier token
 * names the card in `uses` and the player's choice in `choices.merchantStation`: 'replenish' fills the commodities
 * up to the faction's value (21.3), 'convert' turns every commodity into a trade good (21.4). Without a choice
 * nothing changes ("may").
 */
import { commodities, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:ms1';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'merchantStation', kind: 'option', label: { ru: 'Что сделать', en: 'Which' }, options: () => ['replenish', 'convert'],
    names: { replenish: { ru: 'Пополнить продукцию', en: 'Replenish commodities' }, convert: { ru: 'Обменять продукцию на товары', en: 'Convert commodities to trade goods' } },
  }],
  holder: 'self',
  play: ctx => {
    const have = ctx.my.commodities;
    if (ctx.choices.merchantStation === 'replenish') {
      const filled = Math.max(have, ctx.commodityValue(ctx.holder));
      return filled > have ? [commodities(ctx.holder, filled - have)] : [];
    }
    return ctx.choices.merchantStation === 'convert' && have > 0 ? [tradeGoods(ctx.holder, have), commodities(ctx.holder, -have)] : [];
  },
};
