/**
 * Functioning Base, an industrial exploration card: "You may gain 1 commodity, or you may spend 1 trade good or 1
 * commodity to draw 1 action card."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2), with the player's choice (`choices[id]`: gain,
 * draw-tradeGood or draw-commodity). Gaining stops at the commodity value (21.2). Drawing spends the trade good or the
 * commodity named, which the card allows although commodities are not otherwise spent (21.7); the action card drawn
 * is entered in the gains, as only the player knows which it is. Spending what the player does not have is warned of
 * as any payment is (shortTradeGoods; shortCommodities for a commodity). Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution with its choice comes in pass 2.
 */
import { gainCommodities } from '../../../replay/cards/trade';
import { spendTradeGoods } from '../../../replay/payment';
import { violation } from '../../../rules/registry';

import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'exploration:fb1';

/** What is spent to draw or to place: a trade good, or a commodity the card allows (21.7). Short of it, the payment is warned of as any is. */
function spend(turn: EffectTurn, commodity: boolean): void {
  if (!commodity) return spendTradeGoods(turn.state, 1, turn.warnings, 'component');
  if (turn.state.commodities < 1) turn.warnings.push(violation('shortCommodities', { needed: 1, have: turn.state.commodities }, 'component'));
  turn.state.commodities -= Math.min(1, turn.state.commodities);
}

export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  choose: [{
    key: id, kind: 'option', options: () => ['gain', 'draw-tradeGood', 'draw-commodity'], label: { ru: 'Что сделать', en: 'What to do' },
    names: {
      gain: { ru: 'Взять 1 продукцию', en: 'Gain 1 commodity' },
      'draw-tradeGood': { ru: 'Потратить товар и взять карту действия', en: 'Spend a trade good to draw an action card' },
      'draw-commodity': { ru: 'Потратить продукцию и взять карту действия', en: 'Spend a commodity to draw an action card' },
    },
  }],
  // The action card drawn is in the entry's gains: only the player knows which it is.
  gained: turn => {
    const choice = turn.choices[id];
    if (choice === 'gain') gainCommodities(turn.game, turn.state, turn.pack, 1, turn.shared);
    else if (choice === 'draw-tradeGood' || choice === 'draw-commodity') spend(turn, choice === 'draw-commodity');
  },
};
