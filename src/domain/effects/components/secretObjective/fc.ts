/**
 * Foster Cohesion (secret objective, Prophecy of Kings): "Be neighbors with all other players."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: neighbours
 * (LRR 60, `areNeighbors`) with every opponent of the game. Scoring it while the board does not meet it breaks LRR 61.5
 * and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until then the
 * card is the hint it was.
 */
import { areNeighbors } from '../../../neighbors';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:fc';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  requirement: ({ game, state, shared, pack }) => {
    // The others as this owner sees them: their replayed states, and mine when the owner is a rival.
    const others = [...Object.values(state.rivals ?? {}), ...(state.faction !== shared.faction ? [shared] : [])];
    return { have: others.filter(other => areNeighbors(game, state, other, pack)).length, need: others.length };
  },
  holder: 'self',
};
