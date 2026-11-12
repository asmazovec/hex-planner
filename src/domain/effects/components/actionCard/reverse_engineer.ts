/**
 * Reverse Engineer (action card, Prophecy of Kings): "After another player discards an action card that has a
 * component action: Take that action card from the discard pile."
 *
 * A hint: the text is shown in the block of its step (its window names no step of the plan, so it has no block), and
 * nothing is counted or lifted. Another player's discard is not planned, and the card taken is entered in «Gained and
 * discarded» like any card drawn; nothing is checked.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:reverse_engineer';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
