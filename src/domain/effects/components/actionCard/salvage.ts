/**
 * Salvage (action card, After you win a space combat): "Your opponent gives you all of their commodities."
 *
 * A `play` of a card used beside my tactical action (`uses`): the opponent with ships in the active system gives me
 * all of their commodities, which become my trade goods (LRR 21.6). The plan does not say who won the battle; the
 * card's own condition is only that there was one, so an active system with no other player's ships is warned of.
 */
import type { ComponentEffect } from '../../types';
import { othersOf, shipsIn, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:salvage';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const slot = turn.entry.type === 'tactical' ? turn.entry.systemId : null;
    const opponent = slot === null ? undefined : othersOf(turn).find(([, state]) => shipsIn(turn, state, slot) > 0);
    if (!opponent) return unmet(turn);
    turn.state.tradeGoods += opponent[1].commodities;
    opponent[1].commodities = 0;
  },
};
