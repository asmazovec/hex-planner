/**
 * Rescue (action card, Thunder's Edge): "After another player moves ships into a system that contains your ships: You
 * may move 1 of your ships into the active system from any system that does not contain one of your command tokens."
 *
 * A hint: the text is shown in the block of its step (movement, from the card's window), and nothing is counted or
 * lifted. The move happens inside another player's tactical action; my ships move only in my own entries, and the
 * replay asks waivers of the owner of an entry only, so the card has nothing to lift or count yet.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:rescue';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
