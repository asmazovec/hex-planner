/**
 * Aetherpassage (Empyrean, ability):
 * After a player activates a system: You may allow that player to move their ships through systems that contain
 * your ships.
 *
 * A play waiver, red in pass 1: the Empyrean player allows another player's ships through systems holding Empyrean
 * ships (58.3.2). It is the Empyrean player's choice in another player's turn, so the mover names it in `uses`; it lifts
 * `routeBlocked` only for systems that hold the Empyrean player's ships.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:aetherpassage';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
