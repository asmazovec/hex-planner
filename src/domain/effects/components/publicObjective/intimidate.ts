/**
 * Intimidate Council (public objective, stage I): "Have 1 or more ships in 2 systems that are adjacent to Mecatol
 * Rex's system."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * ships in 2 systems adjacent to the Mecatol Rex system. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import { systemSlots, tileIdOf } from '../../../replay/board';
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:intimidate';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // Ships in the Mecatol Rex system itself are irrelevant (rulings).
requirement: ({ pack, map, adjacent, fleets }) => {
    const rex = systemSlots(map).find(slot => pack.tiles[tileIdOf(map, slot)]?.number === '18');
    const next = rex === undefined ? [] : adjacent(rex);
    const where = new Set(fleets().map(f => f.slot));
    return { have: next.filter(slot => where.has(slot)).length, need: 2 };
  },
  holder: 'self',
};
