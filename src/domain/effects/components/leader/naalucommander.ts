/**
 * M'aban (Naalu Collective, commander): "At any time: You may look at your neighbors' hands of promissory notes and the
 * top and bottom card of the agenda deck."
 *
 * A hint with no step: it looks at hidden cards, which the plan does not keep.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:naalucommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
