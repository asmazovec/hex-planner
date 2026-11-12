/**
 * "At the start of the strategy phase: Replenish your commodities, then gain 1 trade good."
 *
 * Pass 1: a hint. Pass 2: passive; at the start of every strategy phase the Keleres replenish their commodities
 * and gain 1 trade good, which the count needs (transactions, payment). It asks for a new point at the start of
 * the strategy phase in the round replay.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:council_patronage';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
