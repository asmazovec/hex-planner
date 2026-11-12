/**
 * Occupy the Fringe (secret objective, Prophecy of Kings): "Have 9 or more ground forces on a planet that does not
 * contain 1 of your space docks."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: nine ground
 * forces (infantry and mechs) on one planet without a space dock of the player. Scoring it while the board does not meet
 * it breaks LRR 61.5 and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids
 * nothing. Pass 2: the requirement is written.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:otf';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ state, pack }) => ({
    have: Math.max(0, ...Object.entries(state.ground)
      .filter(([planetId]) => !state.docks.includes(planetId))
      .map(([, units]) => Object.entries(units).reduce((sum, [unit, count]) => sum + (pack.units[unit as keyof typeof pack.units]?.ground ? count ?? 0 : 0), 0))),
    need: 9,
  }),
};
