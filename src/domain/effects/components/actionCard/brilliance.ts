/**
 * Brilliance (action card, Thunder's Edge): "ACTION: Ready 1 of your planets that has a technology specialty or choose 1
 * player to gain their breakthrough."
 *
 * A `play` effect of its component action. Choices: `{ planet: '<planet id>' }` readies that planet (as the readied
 * planets of a strategy card do, LRR 71: a planet I do not control warns `readyNotControlled`, one without a technology
 * specialty warns `playTargetInvalid` and is readied all the same); `{ player: '<me or opponent id>' }` is the other
 * branch, gaining that player's breakthrough, which is not modelled (a holder has only its own faction's breakthrough).
 */
import { componentById } from '../../../components';
import { readyPlanets } from '../../../replay/payment';
import playTargetInvalid from '../../../rules/codes/playTargetInvalid';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:brilliance';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planet',
    kind: 'planet',
    options: ({ state, pack }) => Object.keys(state.control).filter(planet => state.control[planet] === 'me' && (pack.planets[planet]?.tech ?? []).length > 0),
  }],
  play: ({ state, choices, pack, warnings }) => {
    const planet = choices.planet === undefined ? '' : String(choices.planet);
    if (!planet) return;
    if ((pack.planets[planet]?.tech ?? []).length === 0) {
      warnings.push(violation(playTargetInvalid.code, { name: componentById(pack, id)?.name ?? id, reason: 'no technology specialty' }, 'component'));
    }
    readyPlanets(state, [planet], warnings, 'component');
  },
};
