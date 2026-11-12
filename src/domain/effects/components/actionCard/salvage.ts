/**
 * Salvage (action card, After you win a space combat): "Your opponent gives you all of their commodities."
 *
 * A `play` of a card used beside my tactical action (`uses`): the opponent in the active system gives me all of their
 * commodities, which become my trade goods (LRR 21.6). Pass 1 keeps it the hint it is today; its tests say what pass
 * 2 builds.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:salvage';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
