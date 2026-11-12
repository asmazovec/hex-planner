/**
 * The Sowing (The Firmament, breakthrough): "When you gain this card and at the start of the status phase, you may place
 * up to 3 of your trade goods on this card. Flip this card if you become The Obsidian faction."
 *
 * A hint in the status phase. Putting trade goods on the card is the player's choice and their only use is The Reaping
 * after a change of faction, which the plan does not model; the trade goods set aside are entered by hand. Nothing is
 * checked, so nothing is lifted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:firmamentbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
