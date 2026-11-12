/**
 * Black Market Dealings (action card, Thunder's Edge): "When you are negotiating a transaction: You and the other player
 * may include relics, action cards, and unscored secret objectives as part of the transaction. This card cannot be
 * canceled."
 *
 * A waiver of `transactionKind` (LRR 94.3) for the turn whose entry names the card in `uses`: a relic, an action card or
 * an unscored secret objective handed over in its transactions, by either side, is allowed. Anything else (a
 * technology, an agenda, a scored objective) still stands. Action cards already pass the app's check (94.3.1 is
 * modelled as allowed for everyone), so only relics and secret objectives are ever lifted. Only the entry: no `lasts`.
 * "Cannot be canceled" counts nothing.
 *
 * Pass 1: still the hint it is today; pass 2 writes the waiver.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:blackmarketdealing';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
