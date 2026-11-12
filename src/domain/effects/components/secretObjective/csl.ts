/**
 * Cut Supply Lines (secret objective): "Have 1 or more ships in the same system as another player's space dock."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it asks where ships stand beside another player's space dock; it lifts no rule of movement, blockade or combat. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:csl';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
