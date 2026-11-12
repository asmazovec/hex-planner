/**
 * Mercenary Contract (action card, Thunder's Edge): "ACTION: Spend 2 trade goods to place 2 neutral infantry on any
 * non-home planet that contains no units; if that planet was owned by another player, they return its planet card to
 * the planet card deck."
 *
 * A `play` effect of its component action, for what the plan counts: the 2 trade goods spent (`shortTradeGoods` when the
 * player has fewer, as any payment in trade goods) and the planet chosen, `{ planet: '<planet id>' }`, which must be a
 * non-home planet with no units (a new code otherwise). A planet of mine loses my control. Neutral units are not
 * modelled (no neutral player on the board), so the two infantry themselves are not placed.
 *
 * Pass 1: still the hint it is today; pass 2 writes `play`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:mercenarycontract';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
