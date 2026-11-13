/**
 * Occupy the Seat of the Empire (secret objective, status phase): "Control Mecatol Rex and have 3 or more ships in its system."
 *
 * Decided: a hint of the status step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored in the Score Objectives step of the status phase (LRR
 * 61.5.1, 81.1), so its reminder stands in the block of the status entry. Nothing is validated: three ships at
 * Mecatol Rex are a condition the player meets, not a rule movement or the fleet pool breaks. Scoring stays the
 * player's choice in the status entry (`scored`).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:ose';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
