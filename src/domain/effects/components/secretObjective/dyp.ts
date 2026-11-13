/**
 * Demonstrate Your Power (secret objective, action phase): "Have 3 or more non-fighter ships in the active system at the end of a space combat."
 *
 * Decided: a hint of the combat step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored during the action phase around a battle in space (LRR
 * 61.5.2, 61.7; the space cannon steps belong to the block of the battle as the action card windows have them), so
 * its reminder stands in the block of the battle. Nothing is validated: the plan simulates no combat and so knows
 * no ships left at its end. Scoring stays the player's choice in the status entry (`scored`).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:dyp';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
