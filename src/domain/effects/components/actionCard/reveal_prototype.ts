/**
 * Reveal Prototype (action card, Prophecy of Kings): "At the start of a combat: Spend 4 resources to research a unit
 * upgrade technology of the same type as 1 of your units that is participating in this combat."
 *
 * A hint: the text is shown in the block of its step (combat, from the card's window), and nothing is counted or
 * lifted. The plan simulates no combat, and only a component action carries choices: a tactical entry has no field
 * for the technology researched by a card nor a payment beside its production. The technology is entered in «Gained
 * and discarded» by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:reveal_prototype';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
