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
  requirement: ({ pack, game, state }) => {
    const theirs = new Set(game.opponents.flatMap(o => pack.tiles[pack.factions[o.faction]?.homeTile ?? '']?.planetIds ?? []));
    const have = Object.keys(state.control).filter(planet => state.control[planet] === 'me' && theirs.has(planet)).length;
    return { have, need: 1 };
  },
  holder: 'self',
};
