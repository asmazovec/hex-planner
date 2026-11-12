/**
 * Blackshade Infiltrator (Yssaril, mech): "DEPLOY: After you use your Stall Tactics faction ability, you may place
 * 1 mech on a planet you control."
 *
 * Decided: a `play` named in `uses` of the Stall Tactics component action: one mech from the reinforcements goes on
 * the planet of the choice `planet` (asked of the mech in «Used»; the entry's own `choices.planet` is read too).
 * A planet the Yssaril do not control gets nothing and is warned of (`placeNotControlled`, 67.4.1). Named anywhere
 * else it does nothing, and so it does for another faction. Reinforcements are not counted.
 */
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { planetsOf, systemSlots } from '../../../replay/board';
import { add } from '../../../replay/state';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'mech:yssaril_mech';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'planet', kind: 'planet',
    options: ({ game, pack, state }) => [...new Set(systemSlots(game).flatMap(slot => planetsOf(game, slot, pack)))].filter(planetId => state.control[planetId] === 'me'),
  }],
  play: ({ game, state, entry, pack, choices, warnings, held }) => {
    if (!held || game.faction !== 'yssaril' || entry.type !== 'component' || entry.componentId !== 'ability:stall_tactics') return;
    const planet = choices.planet ?? entry.choices?.planet;
    if (planet === undefined || pack.planets[String(planet)] === undefined) return;
    if (state.control[String(planet)] !== 'me') warnings.push(violation(placeNotControlled.code, { planetId: String(planet) }));
    else add(state.ground, String(planet), { mech: 1 });
  },
};
