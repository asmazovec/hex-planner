/**
 * Fuel the War Machine (secret objective): "Have 3 space docks on the game board."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts space docks on the board; it does not lift the limit of one space dock per planet or of the reinforcements. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:fwm';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
