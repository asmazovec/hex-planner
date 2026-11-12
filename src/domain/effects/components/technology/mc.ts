/**
 * Mirror Computing (Mentak Coalition, faction technology): "When you spend trade goods, each trade good is worth 2
 * resources or influence instead of 1."
 *
 * Decided: a passive `modify`: each trade good spent is worth 2 resources or influence, so the checks of payment
 * (`shortResources`, `shortInfluence`) run against the doubled value. Trade goods spent beyond those held stay
 * warned (`shortTradeGoods`). Pass 2 needs a point for the value of a trade good in src/domain/replay/payment.ts.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:mc';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
