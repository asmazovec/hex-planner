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
import type { Ability } from '../../../../game/abilities/types';
import { gain } from '../../../../game/abilities/emit';

export const id = 'agenda:holy_planet_of_ixth';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // "Units on this planet cannot use PRODUCTION": the dock of the elected planet is worth nothing, so any unit built is over it.
  modify: { productionValue: (value, ctx) => (ctx.attached?.includes(id) ? 0 : value) },
  holder: 'anyone',
  on: {
    // "The planet's owner gains 1 victory point": once, when the law is resolved, if I control the elected planet.
    gained: ctx => (ctx.my.planets().some(planet => planet.id === String(ctx.choices.elect ?? '')) ? [gain.points(ctx.holder, 1)] : undefined),
    // "When a player gains control of this planet, they gain 1 victory point."
    onGainControl: (ctx, got) => (ctx.board.planets[got.planetId]?.attached.includes(id) ? [gain.points(ctx.holder, 1)] : undefined),
  },
};
