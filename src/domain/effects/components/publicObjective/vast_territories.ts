/**
 * Patrol Vast Territories (public, stage II objective, Prophecy of Kings): "Have units in 5 systems that do not contain planets."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts systems without planets where the player has units; no rule of movement or of the fleet pool is lifted. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:vast_territories';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
