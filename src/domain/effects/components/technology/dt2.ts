/**
 * Dimensional Tear II (Vuil'raith Cabal, space dock upgrade): "PRODUCTION 7. This system is a gravity rift; your ships
 * do not roll for this gravity rift. Place a dimensional tear token beneath this unit as a reminder. Up to 12 fighters
 * in this system do not count against your ships' capacity."
 *
 * Decided: `modify` at three points: the dock's Production is 7, whatever its planet's resources (the generated Space
 * Dock II would give resources + 4); its system keeps 12 fighters apart from capacity instead of 3; and its system is a
 * gravity rift for the Cabal's moves (+1 out of or through it, Vuil'raith, Dimensional Tear note 2).
 */
import { ownDockIn } from '../../helpers/movement';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:dt2';

export const ability: Ability = {
  tier: 'passive',
  rule: '97.4',
  modify: {
    // The dock's Production is 7 whatever its planet's resources.
    productionValue: (value, ctx) => (ctx.structure === 'spacedock' ? 7 : value),
    // Up to 12 fighters in the dock's system do not count against capacity, in place of 3.
    dockFighters: () => 12,
    // The system of one of its docks is a gravity rift (41.1).
    gravityRift: (value, ctx) => (ctx.state && ownDockIn(ctx.game, ctx.state, ctx.systemId, ctx.pack) ? 1 : value),
  },
  holder: 'self',
};
