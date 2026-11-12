/**
 * ZS Thunderbolt M2 (Federation of Sol, mech): "DEPLOY: After you use your Orbital Drop faction ability, you may
 * spend 3 resources to place 1 mech on that planet."
 *
 * Pass 1: a hint. Decided: `play`, named in `uses` of the Orbital Drop entry: 1 mech from reinforcements on the planet of
 * the drop (choices.planet); the reinforcements of mechs are limited (30.2). The 3 resources are not paid by a component
 * entry, which has no payment yet.
 */
import { unitLimitWarnings } from '../../../replay/production';
import type { ComponentEffect } from '../../types';

export const id = 'mech:sol_mech';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, entry, state, warnings, pack }) => {
    // The deploy follows the use of Orbital Drop: the entry is that component action, and the planet is its choice.
    if (game.faction !== 'sol' || entry.type !== 'component' || entry.componentId !== 'ability:orbital_drop') return;
    const planet = entry.choices?.planet;
    if (typeof planet !== 'string') return;
    warnings.push(...unitLimitWarnings(state, { mech: 1 }, pack, 'component'));
    // Orbital Drop warned already if the planet is not the player's; the mech stands there all the same.
    const here = state.ground[planet] ?? {};
    state.ground[planet] = { ...here, mech: (here.mech ?? 0) + 1 };
  },
};
