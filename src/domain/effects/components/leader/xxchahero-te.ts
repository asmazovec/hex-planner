/**
 * Xxekir Grom, Planetary Defense Nexus (Xxcha, hero, Thunder's Edge): "ACTION: Place any combination of up to 4 PDS or
 * mechs onto planets you control; ready each planet that you place a unit on. Then, purge this card."
 *
 * Decided: `play`. Its component action names the placements in `choices` as `'<unit>@<planet>': count` (`pds` or
 * `mech`); each unit is placed from the reinforcements and each planet it goes on is readied (the replay purges the
 * hero). The structure rules still hold (on a planet the player controls, 2 PDS a planet), and more than 4 units is
 * warned of with a new code. Rulings: a readied planet may take units, several on one planet.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:xxchahero-te';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
