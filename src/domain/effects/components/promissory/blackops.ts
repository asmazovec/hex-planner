/**
 * Black Ops (The Firmament, promissory note): "When you receive this card, if you are not the Firmament: The Firmament
 * player may place 1 facedown plot card in their play area with your control token on it. Then, gain 2 command tokens,
 * gain 2 trade goods, and purge this card."
 *
 * Decided: played on receipt. When a player other than the Firmament receives the note in a transaction, they gain 2
 * trade goods and 2 command tokens, and the note is purged (held by nobody afterwards). The plot card is not tracked.
 * Nothing is waived; the gains go through the checks of any gain of tokens (the sixteen of a faction).
 */
import { noteBase } from '../../../components';
import { card, gain } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:blackops';

export const ability: Ability = {
  tier: 'hint',
  rule: id,
  holder: 'anyone',
  on: {
    // The note is held by its receiver after the deal, so its own `dealt` runs: it acts on what was received just now.
    dealt: (ctx, deal) => {
      const received = (deal.got.components ?? []).filter(note => noteBase(note) === id);
      if (received.length === 0 || ctx.my.faction === 'firmament') return;
      // The tokens go to the tactic pool: the printed text leaves the pool to the player and the plan keeps it simplest.
      return received.flatMap(note => [
        card.lose(deal.self, note, ctx.my.cards('promissory').find(held => held.id === note)?.count ?? 1),
        gain.tradeGoods(deal.self, 2),
        gain.tokens(deal.self, { tactic: 2 }, 'transaction'),
      ]);
    },
  },
};
