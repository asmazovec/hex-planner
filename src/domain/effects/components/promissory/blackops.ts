/**
 * Black Ops (The Firmament, promissory note): "When you receive this card, if you are not the Firmament: The Firmament
 * player may place 1 facedown plot card in their play area with your control token on it. Then, gain 2 command tokens,
 * gain 2 trade goods, and purge this card."
 *
 * Decided: played on receipt. When a player other than the Firmament receives the note in a transaction, they gain 2
 * trade goods and 2 command tokens, and the note is purged (held by nobody afterwards). The plot card is not tracked.
 * Nothing is waived; the gains go through the checks of any gain of tokens (the sixteen of a faction).
 *
 * Pass 1: still the hint it is today; the receipt comes in pass 2 (a hook where a transaction hands a component over).
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:blackops';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
