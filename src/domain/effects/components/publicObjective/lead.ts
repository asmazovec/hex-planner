/**
 * Lead From the Front (public objective, stage I): "Spend a total of 3 tokens from your tactic and/or strategy
 * pools."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 3 tokens from the tactic and strategy pools. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';
import '../../points/status';

export const id = 'publicObjective:lead';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Tokens of the fleet pool do not count (61.10): the tactic and strategy pools must hold 3. Which pools pay is not entered: nothing is taken.
  requirement: ({ state }) => ({ have: state.tactic + state.strategy, need: 3 }),
};
