/**
 * Nekro Acidos (Nekro Virus, commander): "After you gain a technology: You may draw 1 action card."
 *
 * A hint at the strategy card step, where technologies are mostly gained: the card drawn is entered as a gain; a
 * draw from the deck is no check of the plan.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nekrocommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
