/**
 * Make History (public objective, stage II, Prophecy of Kings): "Have units in 2 systems that contain legendary planets, Mecatol Rex, or anomalies."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the systems that are Mecatol Rex's, or hold a legendary
 * planet or an anomaly, in which the owner has a unit (ships, ground forces or structures; the planet need not be
 * controlled, ruling 2.2); unmet is the warning objectiveUnmet (61.5.1).
 */
import { planetsOf, tileAt } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:make_history';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state }) => {
    const any = (units: Record<string, number | undefined> | undefined) => Object.values(units ?? {}).some(count => (count ?? 0) > 0);
    const slots = new Set(Object.keys(game.map).concat(Object.keys(game.fracture.tiles ?? {})));
    let have = 0;
    for (const slot of slots) {
      const tile = tileAt(game, slot, pack);
      const planets = planetsOf(game, slot, pack);
      const special = tile?.id === '18' || tile?.id === '112' || tile?.anomaly !== undefined || tile?.secondAnomaly !== undefined
        || planets.some(planet => pack.planets[planet]?.legendary !== undefined);
      if (!special) continue;
      const present = any(state.systems[slot])
        || planets.some(planet => any(state.ground[planet]) || state.docks.includes(planet) || (state.pds[planet] ?? 0) > 0);
      if (present) have += 1;
    }
    return { have, need: 2 };
  },
};
