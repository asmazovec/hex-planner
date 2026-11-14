/**
 * Core Mining (agenda):
 * "Attach this card to the elected planet's card. Then, destroy 1 infantry on the planet. The resource value of
 * this planet is increased by 2."
 *
 * A law attached to the elected planet (`choices.elect`): its resource value is 2 more, a `modify` of the
 * point `planetResources` for that planet, and when it is resolved one infantry on the planet is destroyed. Pass 1:
 * still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:core_mining';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // A law is asked for every planet: it adds 2 only where it is attached (`ctx.attached`).
  modify: { planetResources: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value) },
  holder: 'anyone',
  on: {
    // "Then, destroy 1 infantry on the planet": once, when the law is resolved on the elected planet.
    gained: ctx => {
      const planet = String(ctx.choices.elect ?? '');
      return (ctx.my.unitsOn(planet).infantry ?? 0) > 0 ? [{ type: 'UnitsRemoved', player: ctx.holder, at: { planet }, units: { infantry: 1 } }] : undefined;
    },
  },
};
