/**
 * Miscount Disclosed (agenda): "(When this agenda is revealed, if there are no laws in play, discard this card and
 * reveal another agenda from the top of the deck.) Vote on the elected law as if it were just revealed from the top
 * of the deck."
 *
 * A hint. A vote on a law again; votes are not counted by the plan.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:miscount';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
