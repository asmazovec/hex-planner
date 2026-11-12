/**
 * Acquiescence (Winnu, promissory note): "When the Winnu player resolves a strategic action: You do not have to spend
 * or place a command token to resolve the secondary ability of that strategy card. Then, return this card to the Winnu
 * player."
 *
 * Decided: `play` with a waiver. The note is named in `uses` of the holder's secondary entry: the strategy token the
 * secondary costs (20.5, 83.4) is not spent, and the `shortStrategy` warning of that entry is lifted. Its own owner
 * cannot play it (69.2, `ownPromissory`), and the replay already returns it to the Winnu player (69.3).
 *
 */
import { noteAddress, noteBase } from '../../../components';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:acq';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'shortStrategy',
    rule: 'You do not have to spend or place a command token to resolve the secondary ability of that strategy card',
    // Only a note of another player's: the owner cannot play their own (69.2).
    when: (_warning, { entry }) => (entry?.uses ?? []).some(used => noteBase(used) === id && noteAddress(used) !== (entry?.owner ?? 'me')),
  }],
  // The replay took the token the secondary costs (and warned when the pool was empty); the note gives it back.
  play: ({ entry, state, held, player, id: noteInstance }) => {
    if (!held || entry.type !== 'secondary' || noteAddress(noteInstance) === player) return;
    state.strategy += 1;
  },
};
