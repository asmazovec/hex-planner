/**
 * Particle Synthesis (Ghosts of Creuss, breakthrough): "Each wormhole in a system that contains your ships gains
 * PRODUCTION 1 as if it were a unit you control. Reduce the combined cost of units you produce in systems that
 * contain wormholes by 1 for each wormhole in that system."
 *
 * Decided: `passive`, two changes of the count. A wormhole is a producer: `spaceProduction` (a system's space area that
 * produces, asked only where the player has ships) gains 1 per wormhole of the system, tokens included, and the
 * Production of the system is pooled with its docks' (68.1.1), so a system with a wormhole and no dock no longer
 * warns `noProduction`, and `productionOver` counts the wormholes. `productionCost` (the combined cost, asked when a
 * unit used PRODUCTION) falls by 1 per wormhole of the system.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:ghostbt';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: {
    spaceProduction: (value, ctx) => value + ctx.wormholes.length,
    productionCost: (value, ctx) => Math.max(0, value - ctx.wormholes.length),
  },
};
