/**
 * Holy Planet of Ixth (agenda):
 * "Attach this card to the elected planet's card. The planet's owner gains 1 victory point. Units on this planet
 * cannot use PRODUCTION. When a player gains control of this planet, they gain 1 victory point. When a player
 * loses control of this planet, they lose 1 victory point."
 *
 * A law attached to the elected planet: the units there cannot use PRODUCTION (a `modify` of the
 * point `productionValue` of a dock on that planet to 0, so a production there is over its value), and the player who
 * controls it has 1 victory point more, gained with the control (the hook `onGainControl`, as no step asks the point
 * `vp`). Losing control, which loses the point, is not modelled: a planet a rival takes is no longer mine, but nothing
 * hooks that.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:holy_planet_of_ixth';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // "Units on this planet cannot use PRODUCTION": the dock of the elected planet is worth nothing, so any unit built is over it.
  modify: { productionValue: (value, ctx) => (ctx.attached?.includes(id) ? 0 : value) },
  // "The planet's owner gains 1 victory point": once, when the law is resolved, if I control the elected planet.
  gained: ({ choices, state }) => {
    if (state.control[String(choices.elect ?? '')] === 'me') state.vp += 1;
  },
  // "When a player gains control of this planet, they gain 1 victory point."
  onGainControl: ({ state, planetId }) => {
    if (state.attachments?.[planetId]?.includes(id)) state.vp += 1;
  },
};
