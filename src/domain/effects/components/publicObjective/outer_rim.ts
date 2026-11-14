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
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:outer_rim';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ pack, map, my, fleets, grounds }) => {
    const here = new Set(fleets().map(f => f.slot));
    const ground = new Set(grounds().map(g => g.planet));
    const built = new Set(my.structures().filter(s => (s.structures.spacedock ?? 0) > 0 || (s.structures.pds ?? 0) > 0).map(s => s.planet));
    const standsIn = (slot: string, planets: string[]) => here.has(slot) || planets.some(planet => ground.has(planet) || built.has(planet));
    const home = pack.factions[my.faction]?.homeTile;
    let have = 0;
    for (const slot of Object.keys(map.map)) {
      if (tileIdOf(map, slot) === home) continue;
      const edge = [0, 1, 2, 3, 4, 5].some(side => {
        const next = slotAcross(slot, side);
        return next !== null && !isOnMap(map, next);
      });
      if (edge && standsIn(slot, planetsOf(map, slot, pack))) have += 1;
    }
    return { have, need: 3 };
  },
  holder: 'self',
};
