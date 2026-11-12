/**
 * Sundered (Crimson Rebellion, ability): "You cannot use wormholes other than epsilon wormholes. Other players' units
 * that move or are placed into your home system are destroyed."
 *
 * Decided: a reminder of movement. Both sentences restrict instead of lifting: the first takes the alpha and beta
 * wormholes from the Rebellion's routes, the second destroys other players' units. The foundation of effects only
 * lifts checks or changes the numbers of a player's own count, and a step between two systems that are not joined is
 * entered today as a jump and not warned of (src/domain/movement.ts), so a route through an alpha wormhole would have
 * no check to fall under. The home system of the Rebellion lies off the board (Sorrow).
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:sundered';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
