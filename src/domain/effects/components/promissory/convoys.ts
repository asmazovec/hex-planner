/**
 * Trade Convoys (Emirates of Hacan, promissory note): "ACTION: Place this card faceup in your play area. While this
 * card is in your play area, you may negotiate transactions with players who are not your neighbor. If you activate a
 * system that contains 1 or more of the Hacan player's units, return this card to the Hacan player."
 *
 * Decided: `play` with a waiver of `notNeighbor` (94.1). Played by a component action it stays in the play area, and
 * the waiver holds from then until its player activates a system holding the Hacan's units, when it goes back to the
 * Hacan. In hand it does nothing (Hacan note 4). A played note stays in the play area today; the return on that
 * activation is to be replayed. One transaction per player per turn still stands (note 3). Pass 1: still the hint it
 * is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:convoys';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Played, the note stays in the play area: nothing on the board changes, the card itself does the work. The replay
  // does not tell a note in hand from one in play, so the waiver lasts to the end of the round of the play (a later
  // round and the return to the Hacan on activation need that difference).
  play: () => {},
  waive: [{ code: 'notNeighbor', rule: 'While this card is in your play area, you may negotiate transactions with players who are not your neighbor.', lasts: 'round' }],
};
