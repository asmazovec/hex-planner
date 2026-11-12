/**
 * Gravity Drive: "After you activate a system, apply +1 to the move value of 1 of your ships during this tactical
 * action."
 *
 * Pass 2 makes it a `passive` waiver of `speedShort` (58.3.6), narrowed with `when`: one ship of the action, short
 * of its route by exactly 1. Not a `modify` of `speed`, which would raise every ship. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:gd';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
