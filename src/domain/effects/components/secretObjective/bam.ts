/**
 * Become a Martyr (secret objective, action phase): "Lose control of a planet in a home system."
 *
 * Decided: a hint of the invasion step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored during the action phase in an invasion (LRR 61.5.2), so
 * its reminder stands in the block of the invasion. Nothing is validated: losing a planet happens in another
 * player's invasion, which the plan does not decide for me. Scoring stays the player's choice in the status entry
 * (`scored`).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:bam';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
