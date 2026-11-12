/**
 * Waylay (action card, Prophecy of Kings): "Before you roll dice for ANTI-FIGHTER BARRAGE: Hits from this roll are
 * produced against all ships (not just fighters)."
 *
 * A hint: the text is shown in the block of its step (combat, from the card's window), and nothing is counted or
 * lifted. Anti-fighter barrage is a roll; the plan simulates no combat and the losses are entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:waylay';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
