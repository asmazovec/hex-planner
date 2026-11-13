/**
 * Minister of Commerce (agenda): "The elected player gains this card. After the owner of this card replenishes
 * commodities, they gain 1 trade good for each player that is their neighbor."
 *
 * Passive, needs a new point of the count: after the owner replenishes commodities (Trade, 92.3/92.5) they gain 1
 * trade good per neighbour (LRR 60). Pass 2: the Trade handler asks a point for the trade goods gained on
 * replenishing, with the neighbours counted; the law is the elected player's only.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import '../../points/moments';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_commerce';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { tradeGoodsOnReplenish: (value, ctx) => value + ctx.neighbours },
};
