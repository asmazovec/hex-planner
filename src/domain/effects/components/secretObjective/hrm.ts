/**
 * Hoard Raw Materials (secret objective, Prophecy of Kings): "Control planets that have a combined resource value of at
 * least 12."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: the printed
 * resources of the planets controlled, exhausted or not, trade goods aside (attachments count: objectives notes, Hoard
 * Raw Materials 1). Scoring it while the board does not meet it breaks LRR 61.5 and is warned of with the common code
 * `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Pass 2: the requirement is written.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:hrm';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ my, planetValue }) => ({
    have: my.planets().reduce((sum, planet) => sum + planetValue(planet.id, 'resources'), 0),
    need: 12,
  }),
  holder: 'self',
};
