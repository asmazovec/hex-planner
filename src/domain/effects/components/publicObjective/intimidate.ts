/**
 * Intimidate Council (public objective, stage I): "Have 1 or more ships in 2 systems that are adjacent to Mecatol
 * Rex's system."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * ships in 2 systems adjacent to the Mecatol Rex system. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import { adjacentTo } from '../../../movement';
import { systemSlots, tileIdOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'publicObjective:intimidate';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Ships in the Mecatol Rex system itself are irrelevant (rulings).
  requirement: ({ pack, game, state }) => {
    const rex = systemSlots(game).find(slot => pack.tiles[tileIdOf(game, slot)]?.number === '18');
    const next = rex === undefined ? [] : adjacentTo(game, rex, pack);
    const held = next.filter(slot => Object.values(state.systems[slot] ?? {}).some(count => (count ?? 0) > 0));
    return { have: held.length, need: 2 };
  },
};
