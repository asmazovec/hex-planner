/**
 * Form Galactic Brain Trust (public objective, stage II): "Control 5 planets that have technology specialties."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: scoring it in the status phase (81.1) is checked against the
 * board before the entry; a planet counts once however many specialties it has (ruling 1); unmet is the warning
 * objectiveUnmet (61.5.1).
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:brain_trust';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, state }) => ({
    have: Object.keys(state.control).filter(planet => state.control[planet] === 'me' && (pack.planets[planet]?.tech?.length ?? 0) > 0).length,
    need: 5,
  }),
};
