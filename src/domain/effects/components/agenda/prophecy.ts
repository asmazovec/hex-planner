/**
 * Prophecy of Ixth (agenda): "The elected player gains this card. The owner of this card applies +1 to the result
 * of their fighter's combat rolls. When the owner of this card uses PRODUCTION, they discard this card unless they
 * produce 2 or more fighters."
 *
 * A hint for the fighters' combat rolls (the plan simulates no combat), and a rule of its own once the law can be
 * the owner's: a production of fewer than 2 fighters discards it.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:prophecy';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'production'] };
