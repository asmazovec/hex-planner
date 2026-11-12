/**
 * Reclaim Ancient Monuments (public, stage II objective, Prophecy of Kings): "Control 3 planets that have attachments."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts controlled planets with attachments; it changes no planet value and lifts no rule of invasion. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:ancient_monuments';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
