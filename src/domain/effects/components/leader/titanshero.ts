/**
 * Ul the Progenitor, Geoform (Titans of Ul, hero): "ACTION: Ready Elysium and attach this card to it. Its resource
 * and influence values are each increased by 3, and it gains the SPACE CANNON 5(x3) ability as if it were a unit."
 *
 * Decided: `play` by its component action: Elysium is readied and the card attached to it, so the planet is worth 3
 * more resources and 3 more influence wherever a payment counts it. The replay already purges a hero when it is
 * played. The Space Cannon is combat, which the plan does not roll.
 */
import type { ComponentEffect } from '../../types';
import { planet } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:titanshero';

const attached = (ctx: { attached?: readonly string[] }): boolean => ctx.attached?.includes(id) ?? false;

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // Asked for the planet the hero is attached to only (`ctx.attached` names it).
  modify: {
    planetResources: (value, ctx) => (attached(ctx) ? value + 3 : value),
    planetInfluence: (value, ctx) => (attached(ctx) ? value + 3 : value),
  },
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => [
    ...(ctx.my.planets().some(each => each.id === 'elysium' && each.exhausted) ? [planet.ready(ctx.holder, 'elysium')] : []),
    { type: 'CardAttached', planet: 'elysium', card: id },
  ],
};
