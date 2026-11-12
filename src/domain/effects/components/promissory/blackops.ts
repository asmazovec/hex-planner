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
import { gainTokens } from '../../../replay/status';
import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'promissory:blackops';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  // The note is held by its receiver after the deal, so its own `dealt` runs: it acts on what was received just now.
  dealt: turn => {
    const received = (turn.got.components ?? []).filter(note => noteBase(note) === id);
    if (received.length === 0 || turn.faction === 'firmament') return;
    for (const note of received) {
      turn.state.holdings.promissory = turn.state.holdings.promissory.filter(held => held !== note);
      turn.state.tradeGoods += 2;
      // The tokens go to the tactic pool: the printed text leaves the pool to the player and the plan keeps it simplest.
      gainTokens({ game: turn.game, state: turn.state, pack: turn.pack, warnings: turn.warnings } as EffectTurn, { tactic: 2 }, 'transaction');
    }
  },
};
