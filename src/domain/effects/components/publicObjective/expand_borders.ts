/**
 * Expand Borders (public objective, stage I): "Control 6 planets in non-home systems."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * control 6 planets outside home systems. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'publicObjective:expand_borders';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, state }) => {
    const inHome = new Set(Object.values(pack.tiles).filter(tile => tile.kind === 'home').flatMap(tile => tile.planetIds));
    const outside = Object.keys(state.control).filter(planet => state.control[planet] === 'me' && !inHome.has(planet));
    return { have: outside.length, need: 6 };
  },
};
