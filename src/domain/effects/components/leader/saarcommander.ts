/**
 * Rowl Sarrig (Clan of Saar, commander): "When you produce fighters or infantry: You may place each of those units at
 * any of your space docks that are not blockaded."
 *
 * Decided (pass 2 to build): a passive waiver of `productionPlace` (68.3: produced ground forces go on the planet of
 * the producing dock), narrowed by `when` to a planet that holds a space dock of mine not blockaded, and to a planet
 * where only infantry were placed. A mech placed there is still warned of. Fighters placed at another dock's space
 * area have no field in the entry yet.
 *
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:saarcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
