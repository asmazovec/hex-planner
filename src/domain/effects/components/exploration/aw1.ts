/**
 * Abandoned Warehouses, an industrial exploration card: "You may gain 2 commodities, or you may convert up to 2 of your
 * commodities to trade goods."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2), with the player's choice (`choices[id]`: gain or
 * convert). Gaining stops at the faction's commodity value (LRR 21.2; the card's note: "A player cannot have more
 * commodities than their commodity value"); converting turns up to two of the player's commodities into trade goods
 * (21.5.3). Nothing is waived, nothing is warned of: both halves are capped by what the player has.
 *
 * Pass 1: still the hint it is today; the resolution with its choice comes in pass 2.
 */
import { gainCommodities } from '../../../replay/cards/trade';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:aw1';

export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  choose: [{
    key: id, kind: 'option', options: () => ['gain', 'convert'], label: { ru: 'Что сделать', en: 'What to do' },
    names: { gain: { ru: 'Взять 2 продукции', en: 'Gain 2 commodities' }, convert: { ru: 'Обменять до 2 продукции на товары', en: 'Convert up to 2 commodities' } },
  }],
  gained: turn => {
    const choice = turn.choices[id];
    if (choice === 'gain') gainCommodities(turn.game, turn.state, turn.pack, 2, turn.shared);
    else if (choice === 'convert') {
      const converted = Math.min(2, turn.state.commodities);
      turn.state.commodities -= converted;
      turn.state.tradeGoods += converted;
    }
  },
};
