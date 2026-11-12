/**
 * Mageon Implants (Yssaril, faction technology): "ACTION: Exhaust this card to look at another player's hand of
 * action cards. Choose 1 of those cards and add it to your hand."
 *
 * Pass 2: a `play`: the component action exhausts it (its text) and moves the action card of its choices from the
 * chosen player's hand to the player's. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:mi';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
