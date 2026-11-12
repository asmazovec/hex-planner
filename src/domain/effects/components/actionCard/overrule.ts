/**
 * Overrule (action card, Thunder's Edge): "Perform the primary ability of a readied or unchosen strategy card."
 *
 * Decided: a play effect with a waiver (pass 2). The primary is entered as a strategic entry of that card naming the
 * action card in `uses`: `foreignPrimary` (83.3) is lifted for that entry alone, and no strategy token is spent for it,
 * since the card, not a faction ability, lets the primary be performed. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:overrule';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // The card, not a token, lets the primary be performed.
  modify: { strategyCost: (value, ctx) => (ctx.secondary ? value : 0) },
  waive: [{ code: 'foreignPrimary', rule: 'Perform the primary ability of a readied or unchosen strategy card.', when: (_warning, ctx) => ctx.before.holdings.hand.includes(id) }],
};
