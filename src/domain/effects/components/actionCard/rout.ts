/**
 * Rout (action card, Prophecy of Kings): "At the start of the 'Announce Retreats' step of space combat, if you are
 * the defender: Your opponent must announce a retreat, if able."
 *
 * A hint: the text is shown in the block of its step (combat, from the card's window), and nothing is counted or
 * lifted. The plan simulates no combat and no retreat: a retreat is the other player's move, entered by hand as their
 * losses or their entry.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:rout';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
