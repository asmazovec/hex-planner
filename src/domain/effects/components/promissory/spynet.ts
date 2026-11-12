/**
 * Spy Net (Yssaril, promissory note): "At the start of your turn: Look at the Yssaril player's hand of action
 * cards. Choose 1 of those cards and add it to your hand. Then, return this card to the Yssaril player."
 *
 * Pass 2: a `play` named in `uses`: the action card of the entry's choices moves from the Yssaril player's hand to
 * the player's. The note goes back by itself (69.3). Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:spynet';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
