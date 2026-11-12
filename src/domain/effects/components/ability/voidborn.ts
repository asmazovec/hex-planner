/**
 * Voidborn (Empyrean, ability):
 * Nebulae do not affect your ships' movement
 *
 * A passive waiver, red in pass 1: a nebula neither ends an Empyrean route (59.1, `routeBlocked` for a nebula only)
 * nor slows a ship that starts in it (59.2, the move value of a route that starts in a nebula is the ship's own).
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:voidborn';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
