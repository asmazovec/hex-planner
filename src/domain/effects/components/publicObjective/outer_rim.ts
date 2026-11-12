/**
 * Populate the Outer Rim (public objective, stage I, Prophecy of Kings): "Have units in 3 systems on the edge of the game board other than your home system."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the systems of the map that lack a neighbouring slot on the
 * map, other than the owner's home system, in which the owner has a unit (ships, ground forces or structures); unmet is
 * the warning objectiveUnmet (61.5.1). An edge that touches a hyperlane (ruling 6) is not told apart: the board has no
 * notion of its edge yet.
 */
import { isOnMap, planetsOf, tileIdOf } from '../../../replay/board';
import { slotAcross } from '../../../route';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:outer_rim';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state }) => {
    const any = (units: Record<string, number | undefined> | undefined) => Object.values(units ?? {}).some(count => (count ?? 0) > 0);
    const home = pack.factions[game.faction]?.homeTile;
    let have = 0;
    for (const slot of Object.keys(game.map)) {
      if (tileIdOf(game, slot) === home) continue;
      const edge = [0, 1, 2, 3, 4, 5].some(side => {
        const next = slotAcross(slot, side);
        return next !== null && !isOnMap(game, next);
      });
      if (!edge) continue;
      const present = any(state.systems[slot])
        || planetsOf(game, slot, pack).some(planet => any(state.ground[planet]) || state.docks.includes(planet) || (state.pds[planet] ?? 0) > 0);
      if (present) have += 1;
    }
    return { have, need: 3 };
  },
};
