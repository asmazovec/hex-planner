/**
 * Strategize (action card, Thunder's Edge, four copies): "ACTION: Perform the secondary ability of any readied or
 * unchosen strategy card."
 *
 * A waiver of `ownSecondary` (LRR 83.4, 82.1) for the secondary entry that names the card in `uses`, narrowed to a card
 * that is still readied: one of my own cards whose primary I have not resolved this round. A card of another player or
 * an unchosen one breaks nothing to begin with. The ruling (tirules2 components/action-cards.md, Strategize 2) keeps the
 * cost: "The active player must still spend a command token to perform the secondary ability, other than for
 * Leadership", so the strategy token is spent as for any secondary. Only the entry: no `lasts`.
 *
 * Not modelled: the secondary performed this way is the player's action (a component action), so it should also be a
 * turn of the round (actionAfterPass); a secondary entry is not a turn today.
 *
 * Pass 1: still the hint it is today; pass 2 writes the waiver.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:strategize1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
