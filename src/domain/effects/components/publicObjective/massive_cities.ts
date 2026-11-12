/**
 * Construct Massive Cities (public, stage II objective, Prophecy of Kings): "Have 7 or more structures."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts the structures on the board; it does not lift the limit of structures per planet or of the reinforcements, so those checks stay. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:massive_cities';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
