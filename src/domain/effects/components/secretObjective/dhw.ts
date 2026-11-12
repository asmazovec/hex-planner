/**
 * Destroy Heretical Works (secret objective, status phase): "Purge 2 of your relic fragments of any type."
 *
 * Decided: a hint of the status step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored in the Score Objectives step of the status phase (LRR
 * 61.5.1, 81.1), so its reminder stands in the block of the status entry. Nothing is validated: purging two
 * fragments is the cost of the point, paid by hand in «Gained and discarded»; it lifts no rule. Scoring stays the
 * player's choice in the status entry (`scored`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:dhw';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
