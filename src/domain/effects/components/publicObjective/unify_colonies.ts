/**
 * Unify the Colonies (public objective, stage I): "Control 6 planets that each have the same planet trait."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the most controlled planets that share one trait; planets
 * without a trait add to none; unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:unify_colonies';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, state }) => {
    const traits: Record<string, number> = {};
    for (const planet of Object.keys(state.control)) {
      if (state.control[planet] !== 'me') continue;
      for (const trait of pack.planets[planet]?.traits ?? []) traits[trait] = (traits[trait] ?? 0) + 1;
    }
    return { have: Math.max(0, ...Object.values(traits)), need: 6 };
  },
  holder: 'self',
};
