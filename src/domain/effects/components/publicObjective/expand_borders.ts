/**
 * Expand Borders (public objective, stage I): "Control 6 planets in non-home systems."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * control 6 planets outside home systems. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:expand_borders';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ pack, my }) => {
    const inHome = new Set(Object.values(pack.tiles).filter(tile => tile.kind === 'home').flatMap(tile => tile.planetIds));
    return { have: my.planets().filter(planet => !inHome.has(planet.id)).length, need: 6 };
  },
  holder: 'self',
};
