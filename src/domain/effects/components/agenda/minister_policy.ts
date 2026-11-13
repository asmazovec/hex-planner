/**
 * Minister of Policy (agenda): "The elected player gains this card. At the end of the status phase, the owner of
 * this card draws 1 action card."
 *
 * A hint. The action card drawn is unknown to the plan; the player enters it as a gain when known.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_policy';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
