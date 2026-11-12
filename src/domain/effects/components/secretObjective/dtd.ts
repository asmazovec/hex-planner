/**
 * Drive the Debate (secret objective, agenda phase): "You or a planet you control are elected by an agenda."
 *
 * Decided: a hint with no step. The card lifts no rule and changes no number of the count: it is the condition of
 * one victory point (LRR 61.4), and it is scored in the agenda phase on the outcome of a vote, and the plan counts
 * no votes.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:dtd';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
