/**
 * "After you perform a component action: You may perform an additional action."
 *
 * Hint. The plan does not count turns of the action phase against each other: no check says one action per turn,
 * so an additional action is no breach to waive.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:kelerescommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
