/**
 * The Reaping (The Obsidian, breakthrough): "Place 1 trade good from the supply onto this card each time you win a
 * combat against a puppeted player. At the start of the status phase, gain all trade goods on this card, then gain an
 * equal number of trade goods from the supply."
 *
 * A hint for the combat and the status phase. Who wins a combat is not counted by the plan and the puppeted players come
 * from plot cards, which are not tracked; the trade goods gained in the status phase are entered by hand. Nothing is
 * checked, so nothing is lifted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:obsidianbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'status'] };
