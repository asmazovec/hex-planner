/**
 * Forge an Alliance (secret objective): "Control 4 cultural planets."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts the controlled cultural planets; it changes no planet value and lifts no rule of invasion. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:faa';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
