/**
 * Hack Election (action card, agenda phase). "After an agenda is revealed: During this agenda, you vote last."
 *
 * Decided: a hint with no step. It changes the order of the votes; the plan counts no votes and the agenda phase has
 * no step of the replay, so nothing is validated.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:hack';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
