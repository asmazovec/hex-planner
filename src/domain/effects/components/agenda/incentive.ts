/**
 * Incentive Program (agenda): "For: Draw and reveal 1 stage I public objective from the deck and place it near the
 * public objectives. Against: Draw and reveal 1 stage II public from the deck and place it near the public
 * objectives."
 *
 * A hint. A directive of the agenda phase: the objective revealed is whichever the deck gives, and the plan records
 * revealed objectives when they are scored. The agenda phase has no step of its own.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:incentive';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
