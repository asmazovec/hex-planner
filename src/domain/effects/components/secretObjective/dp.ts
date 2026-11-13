/**
 * Dictate Policy (secret objective, agenda phase): "There are 3 or more laws in play."
 *
 * Decided: a hint with no step. The card lifts no rule and changes no number of the count: it is the condition of
 * one victory point (LRR 61.4), and it is scored in the agenda phase, which the plan does not play step by step, so
 * it has no block to stand in.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:dp';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
