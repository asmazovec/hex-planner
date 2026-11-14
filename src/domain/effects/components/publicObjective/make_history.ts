/**
 * Make History (public objective, stage II, Prophecy of Kings): "Have units in 2 systems that contain legendary planets, Mecatol Rex, or anomalies."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the systems that are Mecatol Rex's, or hold a legendary
 * planet or an anomaly, in which the owner has a unit (ships, ground forces or structures; the planet need not be
 * controlled, ruling 2.2); unmet is the warning objectiveUnmet (61.5.1).
 */
import { planetsOf, systemSlots, tileAt } from '../../../replay/board';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:make_history';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ pack, map, my, fleets, grounds }) => {
    const here = new Set(fleets().map(f => f.slot));
    const ground = new Set(grounds().map(g => g.planet));
    const built = new Set(my.structures().filter(s => (s.structures.spacedock ?? 0) > 0 || (s.structures.pds ?? 0) > 0).map(s => s.planet));
    const standsIn = (slot: string, planets: string[]) => here.has(slot) || planets.some(planet => ground.has(planet) || built.has(planet));
    let have = 0;
    for (const slot of systemSlots(map)) {
      const tile = tileAt(map, slot, pack);
      const planets = planetsOf(map, slot, pack);
      const special = tile?.id === '18' || tile?.id === '112' || tile?.anomaly !== undefined || tile?.secondAnomaly !== undefined
        || planets.some(planet => pack.planets[planet]?.legendary !== undefined);
      if (special && standsIn(slot, planets)) have += 1;
    }
    return { have, need: 2 };
  },
  holder: 'self',
};
