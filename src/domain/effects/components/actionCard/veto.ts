/**
 * Veto (action card, When an agenda is revealed): "Discard that agenda and reveal 1 agenda from the top of the deck.
 * Players vote on this agenda instead."
 *
 * A hint: the agenda deck and the votes are not counted by the plan; nothing of the board changes.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:veto';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
