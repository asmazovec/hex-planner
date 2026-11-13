/**
 * Mirror Computing (Mentak Coalition, faction technology): "When you spend trade goods, each trade good is worth 2
 * resources or influence instead of 1."
 *
 * Decided: a passive `modify`: each trade good spent is worth 2 resources or influence, so the checks of payment
 * (`shortResources`, `shortInfluence`) run against the doubled value. Trade goods spent beyond those held stay
 * warned (`shortTradeGoods`). Pass 2 needs a point for the value of a trade good in src/domain/replay/payment.ts.
 *
 * Pass 2: `modify` of `tradeGoodValue` (src/domain/effects/points/payment.ts): 2 instead of 1, for resources and influence.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:mc';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { tradeGoodValue: () => 2 },
};
