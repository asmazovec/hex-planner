/**
 * Rule Distant Lands (public, stage II objective, Prophecy of Kings): "Control 2 planets that are each in or adjacent to a different, other player's home system."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts controlled planets by where they lie; it lifts no rule of invasion or of movement. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:distant_lands';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
