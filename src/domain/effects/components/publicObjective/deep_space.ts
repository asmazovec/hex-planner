/**
 * Explore Deep Space (public objective, stage I, Prophecy of Kings): "Have units in 3 systems that do not contain planets."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the systems without planets in whose space area the owner
 * has a unit; the number of units is irrelevant (ruling 1); unmet is the warning objectiveUnmet (61.5.1).
 */
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:deep_space';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ pack, game, state }) => ({
    have: Object.entries(state.systems).filter(([slot, units]) =>
      Object.values(units).some(count => (count ?? 0) > 0) && planetsOf(game, slot, pack).length === 0).length,
    need: 3,
  }),
};
