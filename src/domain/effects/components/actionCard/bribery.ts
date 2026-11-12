/**
 * Bribery (action card, base game; agenda phase, "After the speaker votes on an agenda"): "Spend any number of trade
 * goods. For each trade good spent, cast 1 additional vote for the outcome on which you voted."
 *
 * Decided: a `play`. The votes are not counted, but the trade goods are, and they are gone for the next round. The
 * entry that plays it chooses how many (`choices.tradeGoods`, zero allowed by ruling 2); they leave the player's trade
 * goods, and spending more than they have is a `shortTradeGoods`.
 * Pass 2: written as decided.
 */
import { spendTradeGoods } from '../../../replay/payment';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:bribery';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'tradeGoods', kind: 'number', range: [0, 20], label: { ru: 'Товаров потрачено', en: 'Trade goods spent' } }],
  play: ({ state, choices, warnings }) => {
    spendTradeGoods(state, Math.max(0, Number(choices.tradeGoods) || 0), warnings, 'component');
  },
};
