/**
 * Search Warrant (law): "The elected player gains this card and draws 2 secret objectives. The owner of this card
 * plays with their secret objectives revealed."
 *
 * Decided: hint. The two secret objectives are drawn at random and entered among the agenda entry's gains; playing
 * them revealed changes nothing the plan counts.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:warrant';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
