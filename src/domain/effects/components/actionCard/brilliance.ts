/**
 * Brilliance (action card, Thunder's Edge): "ACTION: Ready 1 of your planets that has a technology specialty or choose 1
 * player to gain their breakthrough."
 *
 * A `play` effect of its component action. Choices: `{ planet: '<planet id>' }` readies that planet (as the readied
 * planets of a strategy card do, LRR 71: a planet I do not control warns `readyNotControlled`, one without a technology
 * specialty warns `playTargetInvalid` and is readied all the same); `{ player: '<me or opponent id>' }` is the other
 * branch, gaining that player's breakthrough, which is not modelled (a holder has only its own faction's breakthrough).
 */
import { planet as planets } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import playTargetInvalid from '../../../rules/codes/playTargetInvalid';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import { controlledPlanets } from '../../helpers/choices';

export const id = 'actionCard:brilliance';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planet',
    kind: 'planet',
    options: ctx => controlledPlanets(ctx).filter(planet => (ctx.pack.planets[planet]?.tech ?? []).length > 0),
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planet = ctx.choices.planet === undefined ? '' : String(ctx.choices.planet);
    if (!planet) return [];
    if ((ctx.pack.planets[planet]?.tech ?? []).length === 0) {
      ctx.warn(violation(playTargetInvalid.code, { name: componentById(ctx.pack, id)?.name ?? id, reason: 'no technology specialty' }, 'component'));
    }
    if (ctx.board.planets[planet]?.owner !== ctx.holder) ctx.warn(violation('readyNotControlled', { planetId: planet }, 'component'));
    return ctx.board.planets[planet]?.exhausted ? [planets.ready(ctx.holder, planet)] : [];
  },
};
