/**
 * Acquiescence (Winnu, promissory note): "When the Winnu player resolves a strategic action: You do not have to spend
 * or place a command token to resolve the secondary ability of that strategy card. Then, return this card to the Winnu
 * player."
 *
 * Decided: `play` with a waiver. The note is named in `uses` of the holder's secondary entry: the strategy token the
 * secondary costs (20.5, 83.4) is not spent, and the `shortStrategy` warning of that entry is lifted. Its own owner
 * cannot play it (69.2, `ownPromissory`), and the replay already returns it to the Winnu player (69.3).
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:acq';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
