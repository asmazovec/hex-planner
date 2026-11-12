/**
 * Control the Borderlands (public, stage II objective, Prophecy of Kings): "Have units in 5 systems on the edge of the game board other than your home system."
 *
 * A hint. An objective allows nothing the rules forbid and changes no number the count uses: it counts systems on the edge of the board where the player has units; no rule of movement or landing is lifted. Scoring it
 * is recorded by the status entry (`scored`, LRR 61.5, 81.1); whether its condition held is
 * left to the player, as the plan checks no scoring condition. Its text is a reminder in the block of the status step.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:control_borderlands';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['status'],
};
