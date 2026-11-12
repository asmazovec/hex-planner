/**
 * Xxekir Grom, Planetary Defense Nexus (Xxcha, hero, Thunder's Edge): "ACTION: Place any combination of up to 4 PDS or
 * mechs onto planets you control; ready each planet that you place a unit on. Then, purge this card."
 *
 * Decided: `play`. Its component action names the placements in `choices` as `'<unit>@<planet>': count` (`pds` or
 * `mech`); each unit is placed from the reinforcements and each planet it goes on is readied (the replay purges the
 * hero). The structure rules still hold (on a planet the player controls, 2 PDS a planet), and more than 4 units is
 * warned of with a new code. Rulings: a readied planet may take units, several on one planet.
 */
import { placeOnPlanet } from '../../../replay/invasion';
import placementOverLimit from '../../../rules/codes/placementOverLimit';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'leader:xxchahero-te';

/** The most units the hero places. */
const LIMIT = 4;
/** Most PDS a planet holds (85.5). */
const PDS_PER_PLANET = 2;

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ held, game, state, choices, warnings }) => {
    if (!held || game.faction !== 'xxcha') return;
    const placements = Object.entries(choices).flatMap(([key, count]) => {
      const [unit, planetId] = key.split('@');
      return (unit === 'pds' || unit === 'mech') && planetId && Number(count) > 0 ? [{ unit, planetId, count: Number(count) }] : [];
    });
    const total = placements.reduce((sum, placement) => sum + placement.count, 0);
    if (total > LIMIT) warnings.push(violation(placementOverLimit.code, { count: total, limit: LIMIT }));
    for (const { unit, planetId, count } of placements) {
      if (unit === 'pds') {
        if (state.control[planetId] !== 'me') warnings.push(violation('structureNotControlled', { planetId }));
        if ((state.pds[planetId] ?? 0) + count > PDS_PER_PLANET) warnings.push(violation('structureLimit', { kind: 'pds', planetId, count: PDS_PER_PLANET }));
        state.pds[planetId] = (state.pds[planetId] ?? 0) + count;
      } else {
        placeOnPlanet(state, planetId, { mech: count }, warnings, 'component');
      }
      // Each planet a unit is placed on is readied.
      state.exhausted = state.exhausted.filter(each => each !== planetId);
    }
  },
};
