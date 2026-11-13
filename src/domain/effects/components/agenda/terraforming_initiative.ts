/**
 * Terraforming Initiative (agenda):
 * "Attach this card to the elected planet's card. The resource and influence values of this planet are increased
 * by 1."
 *
 * A law attached to the elected planet: its resource and influence values are 1 more, a `modify` of
 * the points `planetResources` and `planetInfluence` for that planet. Pass 1: still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:terraforming_initiative';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  // A law is asked for every planet: it adds 1 only where it is attached (`ctx.attached`).
  modify: {
    planetResources: (value, ctx) => (ctx.attached?.includes(id) ? value + 1 : value),
    planetInfluence: (value, ctx) => (ctx.attached?.includes(id) ? value + 1 : value),
  },
};
