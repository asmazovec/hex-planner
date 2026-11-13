/**
 * New Constitution (agenda): "(When this agenda is revealed, if there are no laws in play, discard this card and
 * reveal another agenda from the top of the deck.) For: Discard all laws from play. At the start of the next
 * strategy phase, each player exhausts each planet in their home system. Against: No effect."
 *
 * A hint. Its outcome depends on the vote; the laws discarded are entered as spends of those laws, the planets
 * exhausted at the next strategy phase are not tracked.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:constitution';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
