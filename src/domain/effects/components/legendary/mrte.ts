/**
 * The Galactic Council (Mecatol Rex, Thunder's Edge): "You may exhaust this card at the end of your turn and discard 1
 * secret objective to draw 1 secret objective."
 *
 * Pass 1: a hint. The swap itself is entered as the entry's `spends` and `gains`, and the replay exhausts the card. To
 * become a `play` that checks the card's condition: it cannot be exhausted by a player with no unscored secret
 * objective in hand (Galactic Council note 1).
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:mrte';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
