/**
 * Integrated Economy: "After you gain control of a planet, you may produce any number of units on that planet that have
 * a combined cost equal to or less than that planet's resource value."
 *
 * Pass 2 makes it a `passive` waiver of `noProduction` (67, 79), narrowed with `when`: the entry gained control of a
 * planet of the system and the combined cost of the production is at most that planet's resources. The units are still
 * paid for (ruling 1). Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ie';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
