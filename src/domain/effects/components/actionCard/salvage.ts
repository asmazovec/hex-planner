/**
 * Salvage (action card, After you win a space combat): "Your opponent gives you all of their commodities."
 *
 * A `play` of a card used beside my tactical action (`uses`): the opponent with ships in the active system gives me
 * all of their commodities, which become my trade goods (LRR 21.6). The plan does not say who won the battle; the
 * card's own condition is only that there was one, so an active system with no other player's ships is warned of.
 */
import { commodities, tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { othersBy, shipsOf, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:salvage';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const slot = ctx.entry?.type === 'tactical' ? ctx.entry.systemId : null;
    const opponent = slot === null ? undefined : othersBy(ctx).find(player => shipsOf(ctx, player, slot) > 0);
    if (opponent === undefined) { unmetBy(ctx); return []; }
    const taken = ctx.of(opponent).commodities;
    return taken > 0 ? [tradeGoods(ctx.holder, taken), commodities(opponent, -taken)] : [];
  },
};
