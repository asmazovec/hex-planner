/**
 * "At the start of any player's turn: You may spend 1 trade good or 1 commodity to treat all laws as blank until
 * the end of that turn."
 *
 * Pass 1: a hint. Pass 2: play, named in `uses` of a turn: it costs 1 trade good or 1 commodity, and the laws are
 * blank for that entry. The laws do not reach the count yet, so only the cost is tested red.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:laws_order';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
