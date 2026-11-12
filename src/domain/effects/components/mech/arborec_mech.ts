/**
 * Letani Behemoth (Arborec, mech): "DEPLOY: When you would use your Mitosis faction ability you may replace 1 of your
 * infantry with 1 mech from your reinforcements instead."
 *
 * A `play` named in the `uses` of the status entry: instead of the infantry Mitosis places, one infantry of mine on a
 * planet becomes a mech. Only the Arborec have Mitosis to hang the deploy on, so another faction's play does nothing.
 * Its PRODUCTION and SUSTAIN DAMAGE are those of a unit, not of this card.
 */
import { planetsOf, systemSlots } from '../../../replay/board';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'mech:arborec_mech';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, state, pack, warnings }) => {
    if (game.faction !== 'arborec') return;
    const planets = systemSlots(game).flatMap(slot => planetsOf(game, slot, pack));
    const planet = planets.find(p => state.control[p] === 'me' && (state.ground[p]?.infantry ?? 0) > 0);
    if (planet === undefined) {
      warnings.push(violation(componentCondition.code, { id, name: 'Letani Behemoth', condition: 'none of my infantry stands on a planet I control' }));
      return;
    }
    const { infantry = 0, ...rest } = state.ground[planet] ?? {};
    const units = { ...rest, mech: (rest.mech ?? 0) + 1, ...(infantry > 1 ? { infantry: infantry - 1 } : {}) };
    state.ground[planet] = units;
  },
};
