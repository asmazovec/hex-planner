/**
 * Dark Pact (Empyrean, promissory note):
 * ACTION: Place this card faceup in your play area. When you give a number of commodities to the Empyrean player
 * equal to your maximum commodity value, you each gain 1 trade good. If you activate a system that contains 1 or
 * more of the Empyrean player's units, return this card to the Empyrean player.
 *
 * Mixed, red in pass 1. The trade good each side gains when the holder gives the Empyrean player commodities equal to
 * the holder's commodity value is counted by the transaction (94, 21.5): pass 2 adds it there. The return on activation
 * stays a reminder: the holdings do not tell a note in hand from one in a play area.
 * Decided (pass 2): a `dealt` hook of the note in force, on the side that gives: the partner is the player whose
 * address the note bears, and the commodities handed over reach the holder's commodity value (as the holder's
 * components make it). Both sides then gain a trade good, the Empyrean player on top of the commodities that arrived.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:dark_pact';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  dealt: turn => {
    // `side` is the side of the entry, not of the card: the holder gives in an entry of its own and in one of mine.
    if (turn.self === turn.partner) return;
    if (!turn.state.holdings.promissory.includes(`${id}@${turn.partner}`)) return;
    const gave = turn.gave.commodities ?? 0;
    if (gave <= 0 || gave < turn.commodityValue) return;
    turn.state.tradeGoods += 1;
    turn.other.tradeGoods += 1;
  },
};
