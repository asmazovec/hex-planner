/**
 * Predictive Intelligence: "At the end of your turn, you may exhaust this card to redistribute your command tokens. When
 * you cast votes during the agenda phase, you may cast 3 additional votes; if you do, and the outcome you voted for is
 * not resolved, exhaust this card."
 *
 * A hint today. Named in an entry's `uses` the card is already exhausted by the replay. The redistribution is a change
 * of the pools with a choice: a `play` once an entry can carry the choices of a component it uses (see the
 * test.todo). Votes are not counted by the plan.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:pi';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
