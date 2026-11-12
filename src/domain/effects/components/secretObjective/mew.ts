/**
 * Make an Example of Their World (secret objective, action phase): "Destroy the last of a player's ground forces on a planet during the bombardment step."
 *
 * Decided: a hint of the invasion step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored during the action phase in an invasion (LRR 61.5.2), so
 * its reminder stands in the block of the invasion. Nothing is validated: the plan rolls no Bombardment and does
 * not know which ground forces its dice destroy. Scoring stays the player's choice in the status entry (`scored`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:mew';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
