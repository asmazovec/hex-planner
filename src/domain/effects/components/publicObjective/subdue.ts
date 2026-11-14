/**
 * Subdue the Galaxy (public objective, stage II): "Control 11 planets in non-home systems."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: counts the controlled planets outside the home system of
 * any player of the game, the owner's own included (ruling 1); unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:subdue';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state }) => {
    const homes = new Set([game.faction, ...game.opponents.map(o => o.faction)].flatMap(f => pack.tiles[pack.factions[f]?.homeTile ?? '']?.planetIds ?? []));
    return { have: Object.keys(state.control).filter(planet => state.control[planet] === 'me' && !homes.has(planet)).length, need: 11 };
  },
  holder: 'self',
};
