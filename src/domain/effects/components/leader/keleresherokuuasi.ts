/**
 * "At the start of a round of of space combat in a system that contains a planet you control: Place your flagship
 * and up to a total of 2 cruisers and/or destroyers from your reinforcements in the active system. Then, purge
 * this card."
 *
 * Pass 1: a hint. Pass 2: play, named in `uses` of a tactical action: the flagship and up to 2 cruisers and/or
 * destroyers come from the reinforcements into the active system and so count against the fleet pool.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:keleresherokuuasi';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
