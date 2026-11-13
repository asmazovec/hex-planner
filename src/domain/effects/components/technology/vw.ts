/**
 * Voidwatch (Empyrean, technology):
 * After a player moves ships into a system that contains 1 or more of your units, they must give you 1
 * promissory note from their hand, if able.
 *
 * A hint: the note is given by another player, of their choice, in their turn; nothing to count for the plan.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:vw';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['movement'] };
