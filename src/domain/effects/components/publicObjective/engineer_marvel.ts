/**
 * Engineer a Marvel (public objective, stage I, Prophecy of Kings): "Have your flagship or a war sun on the game board."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the flagships and war suns the owner has in any space area;
 * unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:engineer_marvel';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ state }) => ({
    have: Object.values(state.systems).reduce((sum, units) => sum + Math.max(0, units.flagship ?? 0) + Math.max(0, units.warsun ?? 0), 0),
    need: 1,
  }),
  holder: 'self',
};
