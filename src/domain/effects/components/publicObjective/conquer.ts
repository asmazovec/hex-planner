/**
 * Conquer the Weak (public objective, stage II): "Control 1 planet that is in another player's home system."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: scoring it in the status phase (81.1) is checked against the
 * board before the entry; the planets counted are the controlled ones that stand in the home system of an opponent of
 * the game; unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:conquer';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ pack, my, others, of }) => {
    const theirs = new Set(others().flatMap(other => pack.tiles[pack.factions[of(other).faction]?.homeTile ?? '']?.planetIds ?? []));
    return { have: my.planets().filter(planet => theirs.has(planet.id)).length, need: 1 };
  },
  holder: 'self',
};
