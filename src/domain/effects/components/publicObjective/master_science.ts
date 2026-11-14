/**
 * Master the Sciences (public objective, stage I): "Own 2 technologies in each of 4 colors."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: counts the colours of which the owner holds at least two
 * technologies; a unit upgrade has no colour (90.7.2) and is in none. Unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:master_science';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, state }) => {
    const colours: Record<string, number> = {};
    for (const tech of state.holdings.technologies) {
      const def = pack.technologies[tech.replace(/^technology:/, '')];
      if (def?.type) colours[def.type] = (colours[def.type] ?? 0) + 1;
    }
    return { have: Object.values(colours).filter(count => count >= 2).length, need: 4 };
  },
  holder: 'self',
};
