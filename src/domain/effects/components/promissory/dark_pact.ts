/**
 * Dark Pact (Empyrean, promissory note):
 * ACTION: Place this card faceup in your play area. When you give a number of commodities to the Empyrean player
 * equal to your maximum commodity value, you each gain 1 trade good. If you activate a system that contains 1 or
 * more of the Empyrean player's units, return this card to the Empyrean player.
 *
 * Mixed, red in pass 1. The trade good each side gains when the holder gives the Empyrean player commodities equal to
 * the holder's commodity value is counted by the transaction (94, 21.5): pass 2 adds it there. The return on activation
 * stays a reminder: the holdings do not tell a note in hand from one in a play area.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:dark_pact';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['transaction', 'activation'] };
