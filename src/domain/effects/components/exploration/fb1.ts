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
import type { ComponentEffect } from '../../types';

export const id = 'exploration:fb1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
