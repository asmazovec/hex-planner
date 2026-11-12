/**
 * Stellar Converter (relic): "ACTION: Choose 1 non-home, non-legendary planet other than Mecatol Rex in a system that
 * is adjacent to 1 or more of your units that have BOMBARDMENT, destroy all units on that planet and purge its
 * attachments and its planet card. Then, place the destroyed planet token on that planet and purge this card."
 *
 * Decided (pass 2): play. `choices.planetId` is destroyed: every unit on it is gone and nobody controls it any more; a
 * target the card does not allow (my own planet, a home or legendary planet, Mecatol Rex, no unit with BOMBARDMENT
 * adjacent) is warned of. The replay already purges the relic. Pass 1 keeps it the hint it is today.
 */
import converterTarget from '../../../rules/codes/converterTarget';
import { inHomeSystem } from '../../../stacks';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'relic:stellarconverter';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  play: ({ game, state, shared, states, pack, choices, warnings, held }) => {
    const planetId = String(choices.planetId ?? '');
    if (!held || !planetId) return;
    const planet = pack.planets[planetId];
    const reason = state.control[planetId] === 'me' ? 'mine'
      : inHomeSystem(game, planetId, pack) ? 'home'
        : planet?.legendary !== undefined ? 'legendary'
          : planet?.name === 'Mecatol Rex' ? 'mecatol' : undefined;
    if (reason) warnings.push(violation(converterTarget.code, { planetId, reason }));
    // Every unit and structure on the planet is destroyed, nobody controls it, its attachments are purged.
    for (const each of new Set([...Object.values(states), shared])) {
      delete each.ground[planetId];
      delete each.control[planetId];
      delete each.pds[planetId];
      each.docks = each.docks.filter(dock => dock !== planetId);
    }
    if (shared.attachments) delete shared.attachments[planetId];
    if (shared.rivalHolds) delete shared.rivalHolds[planetId];
  },
};
