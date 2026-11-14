/**
 * Maxis Central Control (Faunus, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to gain
 * control of a non-home, non-legendary planet that contains no units and has no attachments."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.faunusPlanet`, and I control that
 * planet after the entry.
 */
import { planet } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { requireControlBy } from '../../helpers/cardPlay';
import { controlledPlanets } from '../../helpers/choices';

export const id = 'legendary:faunus';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'faunusPlanet', kind: 'planet',
    // A planet that is not legendary and not mine; whether it holds units or attachments the plan cannot see for every player.
    options: ctx => [...new Set(Object.keys(ctx.table.map).flatMap(slot => ctx.planetsIn(slot)))]
      .filter(planet => ctx.pack.planets[planet]?.legendary === undefined && !controlledPlanets(ctx).includes(planet)),
  }],
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'faunus');
    const target = ctx.choices.faunusPlanet;
    return typeof target === 'string' ? [planet.gain(ctx.holder, target)] : [];
  },
};
