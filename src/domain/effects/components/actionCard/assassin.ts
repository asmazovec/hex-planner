/**
 * Assassinate Representative (action card, base game; agenda phase): "Choose 1 player. That player cannot vote on this
 * agenda."
 *
 * A hint: votes are not counted by the plan. The agenda phase has no step of its own: no steps.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:assassin';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
