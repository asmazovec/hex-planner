/**
 * Learn the Secrets of the Cosmos (secret objective, status phase): "Have 1 or more ships in 3 systems that are each adjacent to an anomaly."
 *
 * Decided: a hint of the status step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored in the Score Objectives step of the status phase (LRR
 * 61.5.1, 81.1), so its reminder stands in the block of the status entry. Nothing is validated: whether three
 * systems with my ships each touch an anomaly is a question of the board at the status phase, not a rule the plan
 * breaks. Scoring stays the player's choice in the status entry (`scored`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:lsc';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
