/**
 * Slipstream (Ghosts of Creuss, ability): "During your tactical actions: Apply +1 to the move value of each of your
 * ships that starts its movement in your home system or in a system that contains either an alpha or beta wormhole."
 *
 * Pass 1: a hint. Decided: `passive` `modify` of the point `speed`, which then needs the system the ship starts in: +1 from
 * the home system or from a system with an alpha or beta wormhole (a Creuss token included); not a delta or gamma one
 * (Creuss notes, Slipstream 1).
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:slipstream';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
