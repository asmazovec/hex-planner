/**
 * Achieve Supremacy (public, stage II objective, Prophecy of Kings): "Have your flagship or war sun in another player's home system or the Mecatol Rex system."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it asks where a flagship or a war sun stands at the Score Objectives step; it lifts no rule of movement or of the fleet pool and changes no number the count uses. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:supremacy';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
