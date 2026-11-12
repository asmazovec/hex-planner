/**
 * Establish Hegemony (secret objective, status phase): "Control planets that have a combined influence value of at least 12."
 *
 * Decided: a hint of the status step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored in the Score Objectives step of the status phase (LRR
 * 61.5.1, 81.1), so its reminder stands in the block of the status entry. Nothing is validated: twelve influence of
 * planets controlled is a condition the player meets, not a rule payment breaks. Scoring stays the player's choice
 * in the status entry (`scored`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:eh';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
