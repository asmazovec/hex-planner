/**
 * Lie in Wait (action card, Thunder's Edge): "After 2 of your neighbors resolve a transaction: Look at each of those
 * players' hands of action cards, then choose and take 1 action card from each."
 *
 * A hint: the text is shown in the block of its step (transaction, from the card's window), and nothing is counted or
 * lifted. It answers a transaction between two other players, which the plan does not hold in my entries, and the
 * cards taken are another player's choice made at the table; they are entered in «Gained and discarded» by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:lieinwait';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
