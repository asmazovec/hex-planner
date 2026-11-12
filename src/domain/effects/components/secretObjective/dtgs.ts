/**
 * Destroy Their Greatest Ship (secret objective): "Destroy another player's war sun or flagship."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it is scored in the action phase when a war sun or flagship of another player is destroyed; the plan simulates no combat and counts no rolls, so nothing of the count can tell whether it was earned. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the combat step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:dtgs';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['combat'],
};
