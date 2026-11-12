/**
 * Found Research Outposts (public objective, stage I): "Control 3 planets that have technology specialties."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * control 3 planets with a technology specialty. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'publicObjective:research_outposts';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // One specialty or two on a planet count the same (rulings).
  requirement: ({ pack, state }) => ({
    have: Object.keys(state.control).filter(planet => state.control[planet] === 'me' && (pack.planets[planet]?.tech?.length ?? 0) > 0).length,
    need: 3,
  }),
};
