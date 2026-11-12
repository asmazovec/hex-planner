/**
 * Icarus Drive (Ghosts of Creuss, mech): "After any player activates a system, you may remove this unit from the game
 * board to place or move a Creuss wormhole token into this system."
 *
 * Pass 1: a hint. Decided: `play`, named in `uses` of the entry that activates a system: the mech is removed from the board
 * and a Creuss wormhole token is placed or moved into the system it was in (Creuss notes, Icarus Drive 2).
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:ghost_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
