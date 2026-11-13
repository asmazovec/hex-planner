/**
 * Minister of Peace (agenda): "The elected player gains this card. After a player activates a system that contains
 * 1 or more of a different player's units, the owner of this card may discard this card - immediately end the
 * active player's turn."
 *
 * A hint. It ends another player's turn at its owner's choice; the plan does not model another player's turn being
 * cut short.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_peace';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation'] };
