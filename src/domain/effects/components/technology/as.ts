/**
 * Aetherstream (Empyrean, technology):
 * After you or one of your neighbors activates a system that is adjacent to an anomaly, you may apply +1 to the
 * move value of all of that player's ships during this tactical action.
 *
 * A passive modify of `speed`, red in pass 1: +1 to the move value of the ships of a tactical action whose active
 * system is adjacent to an anomaly. The point needs the active system in its context. A neighbour's action is not
 * reached (a waiver is asked of the owner of the entry).
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:as';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
