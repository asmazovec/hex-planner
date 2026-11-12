/**
 * Hoard Raw Materials (secret objective, Prophecy of Kings): "Control planets that have a combined resource value of at
 * least 12."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: the printed
 * resources of the planets controlled, exhausted or not, trade goods aside (attachments count: objectives notes, Hoard
 * Raw Materials 1). Scoring it while the board does not meet it breaks LRR 61.5 and is warned of with the common code
 * `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Pass 2: the requirement is written.
 */
import { planetValue } from '../../../payment';
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:hrm';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  requirement: ({ game, state, shared, pack }) => ({
    have: Object.keys(state.control)
      .filter(planetId => state.control[planetId] === 'me')
      .reduce((sum, planetId) => sum + planetValue(pack, state, planetId, 'resources', { faction: game.faction, shared }), 0),
    need: 12,
  }),
};
