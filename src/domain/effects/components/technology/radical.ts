/**
 * "At the start of the status phase, you may replace one of your non-unit upgrade technologies with a technology
 * of the same color that has exactly 1 more prerequisite."
 *
 * Hint. The swap is entered as a spend and a gain of the status entry; prerequisites and colours are not checked
 * by the plan.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:radical';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
