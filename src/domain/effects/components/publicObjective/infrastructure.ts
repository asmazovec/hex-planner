/**
 * Improve Infrastructure (public objective, stage I, Prophecy of Kings): "Have structures on 3 planets outside of your home system."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the planets, not in the owner's home system, that have a
 * space dock or a PDS of the owner; the number of structures on a planet is irrelevant (ruling 1); unmet is the warning
 * objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:infrastructure';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state }) => {
    const home = new Set(pack.tiles[pack.factions[game.faction]?.homeTile ?? '']?.planetIds ?? []);
    const planets = new Set([...state.docks, ...Object.keys(state.pds).filter(planet => (state.pds[planet] ?? 0) > 0)]);
    return { have: [...planets].filter(planet => !home.has(planet)).length, need: 3 };
  },
  holder: 'self',
};
