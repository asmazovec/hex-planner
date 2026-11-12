/**
 * Protect the Border (public, stage II objective, Prophecy of Kings): "Have structures on 5 planets outside of your home system."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts planets with structures outside the home system; the rules of placing structures (Construction, production of a space dock) and their limits stay as they are. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:protect_border';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
