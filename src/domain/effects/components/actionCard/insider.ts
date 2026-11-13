/**
 * Insider Information (action card, agenda phase). "After an agenda is revealed: Look at the top 3 cards of the agenda
 * deck."
 *
 * Decided: a hint with no step. Looking at cards changes nothing the plan counts; the agenda deck is not modelled.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:insider';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
