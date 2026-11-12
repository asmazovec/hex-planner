/**
 * Particle Synthesis (Ghosts of Creuss, breakthrough): "Each wormhole in a system that contains your ships gains
 * PRODUCTION 1 as if it were a unit you control. Reduce the combined cost of units you produce in systems that
 * contain wormholes by 1 for each wormhole in that system."
 *
 * Pass 1: a hint. Decided: `passive`: waivers of `noProduction` (a wormhole in a system with the player's ships produces)
 * and of `productionOver` within one PRODUCTION per wormhole, and a new point of the combined cost of a production, less 1
 * per wormhole of the system.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:ghostbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
