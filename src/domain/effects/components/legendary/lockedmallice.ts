/**
 * Exterrix Headquarters (Mallice on the wormhole nexus before it flips, legendary planet): "You may exhaust this card
 * at the end of your turn to gain 2 trade goods or convert all of your commodities to trade goods."
 *
 * The same card as `legendary:mallice` under the planet id of the other side of tile 82. To be a `play` effect: any
 * entry of my turn names the card in `uses` with `choices.exterrix` = 'tradeGoods' or 'convert'. Pass 1: the hint it
 * is today.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:lockedmallice';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'exterrix', kind: 'option', label: { ru: 'Что сделать', en: 'Which' }, options: () => ['tradeGoods', 'convert'],
    names: { tradeGoods: { ru: 'Получить 2 товара', en: 'Gain 2 trade goods' }, convert: { ru: 'Обменять всю продукцию на товары', en: 'Convert all commodities' } },
  }],
  play: ({ state, pack, choices, warnings }) => {
    // The card lies in the play area of whoever controls the planet (53.2, 53.3); used without it, it is warned of.
    if (state.control[id.slice('legendary:'.length)] !== 'me') warnings.push(violation('componentNotHeld', { id, name: componentById(pack, id)?.name ?? id }));
    if (choices.exterrix === 'tradeGoods') state.tradeGoods += 2;
    else if (choices.exterrix === 'convert') {
      state.tradeGoods += state.commodities;
      state.commodities = 0;
    }
  },
};
