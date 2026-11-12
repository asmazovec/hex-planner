/**
 * Quash (Xxcha, faction ability): "When an agenda is revealed: You may spend 1 token from your strategy pool to discard
 * that agenda and reveal 1 agenda from the top of the deck. Players vote on this agenda instead."
 *
 * Decided: `play`. Agendas are not planned, but the token is: an agenda-phase entry that plays Quash spends 1 strategy
 * token, warned of when the pool has none (`shortStrategy`). It may be used again on the replacement agenda (ruling 3).
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:quash';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
