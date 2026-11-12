/**
 * Masters of Trade (Emirates of Hacan): "You do not have to spend a command token to resolve the secondary ability of
 * the "Trade" strategy card."
 *
 * Decided: `passive`, a `modify` of a new point, the strategy tokens a secondary ability costs, by card: 0 for Trade.
 * The pool is not touched, so `shortStrategy` is not made at all (not waived: the cost itself is gone). Every other
 * secondary still costs its token. Pass 1: still the hint it is today.
 */
import { CARD } from '../../../strategy';
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'ability:master_of_trade';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { strategyCost: (value, ctx) => (ctx.secondary && ctx.card === CARD.trade ? 0 : value) },
};
