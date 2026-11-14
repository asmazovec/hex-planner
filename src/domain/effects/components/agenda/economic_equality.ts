/**
 * Economic Equality (agenda, directive): "For: Each player returns all of their trade goods to the supply. Then, each
 * player gains 5 trade goods. Against: Each player returns all of their trade goods to the supply."
 *
 * Decided: play. The "For" outcome sets the trade goods the plan counts to 5, whatever there were; an agenda entry
 * that resolves it (gains the directive) does it. "Against" sets them to 0 and needs the outcome chosen, which an entry
 * has no field for yet.
 */
import { gain } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:economic_equality';

export const effect: ComponentEffect = { tier: 'play', rule: id };

/** Every player has 5 trade goods when the law is resolved: the owner of the entry is brought to 5. */
export const ability: Hooked = {
  holder: 'anyone',
  play: ctx => (ctx.my.tradeGoods === 5 ? [] : [gain.tradeGoods(ctx.holder, 5 - ctx.my.tradeGoods)]),
  on: { gained: ctx => (ctx.my.tradeGoods === 5 ? undefined : [gain.tradeGoods(ctx.holder, 5 - ctx.my.tradeGoods)]) },
};
