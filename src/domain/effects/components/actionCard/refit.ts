/**
 * Refit Troops (action card, Prophecy of Kings): "ACTION: Choose 1 or 2 of your infantry on the game board. Replace each
 * of those infantry with mechs."
 *
 * A `play` effect of its component action. Choices, one key per place (a planet id or a slot key) with the number of
 * infantry replaced there: `{ h1: 2 }` or `{ h1: 1, t1: 1 }`. The infantry go back to the reinforcements and as many
 * mechs come from them (LRR 72); an infantry chosen where there is none is reported as any missing unit
 * (`unitsMissing`) and nothing replaces it; more than two warns (a new code, see the report) and is replaced all the
 * same, as the plan forbids nothing. Mechs exist only with Prophecy of Kings, which this card needs anyway.
 *
 * Pass 1: still the hint it is today; pass 2 writes `play`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:refit';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
