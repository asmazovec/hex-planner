/**
 * Control the Region (secret objective): "Have 1 or more ships in 6 systems."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts systems with the player's ships; no rule of movement or of the fleet pool is lifted. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1) and moves it from the hand to the scored ones; whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:ctr';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
