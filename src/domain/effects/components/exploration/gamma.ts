/**
 * Gamma Relay (frontier exploration): "Place a gamma wormhole token in this system. Then, purge this card."
 *
 * A hint at the movement step. The token makes the explored system adjacent to every other system with a gamma
 * wormhole (101, wormhole nexus), but the board of the plan keeps no wormhole tokens, and nothing the route checks
 * depends on adjacency: a drawn step between two systems that are not joined is a jump, one step long and never
 * warned of (`fullPath` in src/domain/movement.ts). So no check is redundant or broken by the token; only the
 * highlight of reachable systems would change, and that needs wormhole tokens on the board first.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:gamma';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
