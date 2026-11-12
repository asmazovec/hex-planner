/**
 * Maxis Central Control (Faunus, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to gain
 * control of a non-home, non-legendary planet that contains no units and has no attachments."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.faunusPlanet`, and I control that
 * planet after the entry.
 */
import { componentById } from '../../../components';
import { planetsOf, systemSlots } from '../../../replay/board';
import { violation } from '../../../rules/registry';
import type { ComponentEffect, EffectTurn } from '../../types';

/** The card lies in the play area of whoever controls its planet (53.2, 53.3); used without it, it is warned of. */
const requireControl = (turn: EffectTurn, planet: string): void => {
  if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
};


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
  play: turn => {
    requireControl(turn, 'faunus');
    const planet = turn.choices.faunusPlanet;
    if (typeof planet === 'string') turn.state.control[planet] = 'me';
  },
};
