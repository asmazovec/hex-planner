/**
 * Upgrade (action card, After you activate a system that contains 1 or more of your ships): "Replace 1 of your
 * cruisers in that system with 1 dreadnought from your reinforcements."
 *
 * A `play` of a card used beside my tactical action (`uses`): one of my cruisers in the active system, there when it
 * was activated, is replaced by a dreadnought. A missing cruiser is reported as any missing unit (`unitsMissing`).
 * Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:upgrade';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
