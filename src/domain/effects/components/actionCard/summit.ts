/**
 * Summit (action card, At the start of the strategy phase): "Gain 2 command tokens."
 *
 * A `play` at the start of the strategy phase (an entry of the component kind that is not a turn) with the choices
 * `tactic`, `fleet`, `strategy`: two command tokens are gained into the pools chosen. Pass 1 keeps it the hint it is
 * today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:summit';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
