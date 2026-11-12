/**
 * Kyver, Blade and Key (Yssaril, hero): "ACTION: Each other player shows you 1 action card from their hand. For
 * each player, you may either take that card or force that player to discard 3 random action cards from their
 * hand. Then, purge this card."
 *
 * A hint: which card each player shows and the random discards are not known to the plan; the cards taken are
 * entered by hand. Played, it is purged as any hero.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:yssarilhero';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
