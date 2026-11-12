/**
 * "At any time: You may exhaust this card to allow any player to spend commodities as if they were trade goods."
 *
 * Pass 1: a hint. Pass 2: play, named in `uses`: it waives shortTradeGoods while the trade goods paid fit in the
 * trade goods and commodities held, and spends the commodities for the shortfall (21.7 otherwise forbids spending
 * commodities).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:keleresagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
