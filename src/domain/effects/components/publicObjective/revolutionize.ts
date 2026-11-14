/**
 * Revolutionize Warfare (public objective, stage I): "Own 3 unit upgrade technologies."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: counts the technologies held that are unit upgrades
 * (`TechDef.upgrade`, LRR 90.6); unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:revolutionize';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, state }) => ({
    have: state.holdings.technologies.filter(tech => pack.technologies[tech.replace(/^technology:/, '')]?.upgrade).length,
    need: 3,
  }),
  holder: 'self',
};
