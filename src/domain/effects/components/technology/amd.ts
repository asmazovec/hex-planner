/**
 * Antimass Deflectors: "Your ships can move into and through asteroid fields. When other players' units use SPACE
 * CANNON against your units, apply -1 to the result of each die roll."
 *
 * Pass 2 makes it a `passive` waiver of `routeBlocked` (11.1), narrowed with `when` to the systems that are asteroid
 * fields; a supernova and other players' ships still block. The SPACE CANNON part is dice, not counted. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:amd';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
