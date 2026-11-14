/**
 * Maxis Central Control (Faunus, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to gain
 * control of a non-home, non-legendary planet that contains no units and has no attachments."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.faunusPlanet`, and I control that
 * planet after the entry.
 */
import { planet } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { planetsOf, systemSlots } from '../../../replay/board';
import { requireControlBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:faunus';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'faunusPlanet', kind: 'planet',
    // A planet that is not legendary and not mine; whether it holds units or attachments the plan cannot see for every player.
    options: ctx => [...new Set(systemSlots(ctx.game).flatMap(slot => planetsOf(ctx.game, slot, ctx.pack)))]
      .filter(planet => ctx.pack.planets[planet]?.legendary === undefined && ctx.state.control[planet] !== 'me'),
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'faunus');
    const target = ctx.choices.faunusPlanet;
    return typeof target === 'string' ? [planet.gain(ctx.holder, target)] : [];
  },
};
