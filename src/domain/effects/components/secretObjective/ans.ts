/**
 * Adapt New Strategies (secret objective): "Own 2 faction technologies. 'Valefar Assimilator' technologies do not count toward this objective."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts the faction technologies the player owns; it changes neither the research cost nor the prerequisites, so the research checks stay. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:ans';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
