/**
 * Exterrix Headquarters (Mallice on the wormhole nexus before it flips, legendary planet): "You may exhaust this card
 * at the end of your turn to gain 2 trade goods or convert all of your commodities to trade goods."
 *
 * The same card as `legendary:mallice` under the planet id of the other side of tile 82. To be a `play` effect: any
 * entry of my turn names the card in `uses` with `choices.exterrix` = 'tradeGoods' or 'convert'. Pass 1: the hint it
 * is today.
 */
import { commodities, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { requireControlBy } from '../../helpers/cardPlay';

export const id = 'legendary:lockedmallice';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'exterrix', kind: 'option', label: { ru: 'Что сделать', en: 'Which' }, options: () => ['tradeGoods', 'convert'],
    names: { tradeGoods: { ru: 'Получить 2 товара', en: 'Gain 2 trade goods' }, convert: { ru: 'Обменять всю продукцию на товары', en: 'Convert all commodities' } },
  }],
  holder: 'self',
  play: ctx => {
    // The card lies in the play area of whoever controls the planet (53.2, 53.3); used without it, it is warned of.
    requireControlBy(ctx, id.slice('legendary:'.length));
    if (ctx.choices.exterrix === 'tradeGoods') return [tradeGoods(ctx.holder, 2)];
    if (ctx.choices.exterrix === 'convert') {
      const all = ctx.my.commodities;
      return all > 0 ? [tradeGoods(ctx.holder, all), commodities(ctx.holder, -all)] : [];
    }
    return [];
  },
};
