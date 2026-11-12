/**
 * Senate Sanctuary (agenda):
 * "Attach this card to the elected planet's card. The influence value of this planet is increased by 2."
 *
 * A law attached to the elected planet: its influence value is 2 more, a `modify` of the point
 * `planetInfluence` for that planet. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:senate_sanctuary';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // A law is asked for every planet: it adds 2 only where it is attached (`ctx.attached`).
  modify: { planetInfluence: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value) },
};
