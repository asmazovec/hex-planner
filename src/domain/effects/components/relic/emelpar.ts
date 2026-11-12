/**
 * Scepter of Emelpar (relic): "When you would spend a token from your strategy pool, you may exhaust this card to spend
 * a token from your reinforcements instead."
 *
 * Decided (pass 2): play. A secondary (or a primary for a token) that names it in `uses` takes its token from the
 * reinforcements, so the strategy pool keeps it and `shortStrategy` does not stand; the replay already exhausts the
 * relic. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:emelpar';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
