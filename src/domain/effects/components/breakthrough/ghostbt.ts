/**
 * Particle Synthesis (Ghosts of Creuss, breakthrough): "Each wormhole in a system that contains your ships gains
 * PRODUCTION 1 as if it were a unit you control. Reduce the combined cost of units you produce in systems that
 * contain wormholes by 1 for each wormhole in that system."
 *
 * Decided: `passive`: waivers of `noProduction` (a wormhole in a system with the player's ships produces) and of
 * `productionOver` within one PRODUCTION per wormhole (the units fit the value plus the wormholes), and a change of the
 * combined cost of a production, less 1 per wormhole of the system.
 *
 * Built: the two waivers. NOT built: the cost and a production over the wormholes' PRODUCTION when no dock stands
 * there, because `productionCost` and `spaceProduction` are asked without the system (`productionCost: { faction }`)
 * or without the game (`spaceProduction: { systemId, anomalies, units }`), so a modify cannot count the wormholes.
 */
import { wormholesOf } from '../../../movement';
import type { UnitId, Warning } from '../../../types';
import type { ComponentEffect, WaiverContext } from '../../types';

export const id = 'breakthrough:ghostbt';

/** The wormholes of the system a production warning is about, the Creuss tokens included. */
const wormholesOfWarning = (warning: Warning, ctx: WaiverContext): number =>
  warning.params.systemId === undefined ? 0 : wormholesOf(ctx.game, ctx.pack, String(warning.params.systemId), ctx.shared.wormholeTokens).length;

/** Whether the player has ships in the system: before the entry, or arriving in it with the entry. */
function shipsIn(slot: string, ctx: WaiverContext): boolean {
  const isShip = (unit: string): boolean => ctx.pack.units[unit as UnitId] !== undefined && !ctx.pack.units[unit as UnitId]?.ground;
  const standing = Object.entries(ctx.before.systems[slot] ?? {}).some(([unit, n]) => (n ?? 0) > 0 && isShip(unit));
  if (standing || ctx.entry?.type !== 'tactical' || ctx.entry.systemId !== slot) return standing;
  return ctx.entry.moves.some(move => Object.entries(move.units).some(([unit, n]) => (n ?? 0) > 0 && isShip(unit)));
}

const RULE = 'Each wormhole in a system that contains your ships gains PRODUCTION 1 as if it were a unit you control.';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [
    {
      code: 'noProduction',
      rule: RULE,
      when: (warning, ctx) => wormholesOfWarning(warning, ctx) > 0 && shipsIn(String(warning.params.systemId), ctx),
    },
    {
      code: 'productionOver',
      rule: RULE,
      when: (warning, ctx) => {
        const slot = ctx.entry?.type === 'tactical' ? ctx.entry.systemId : null;
        return slot !== null &&shipsIn(slot, ctx) && Number(warning.params.count) <= Number(warning.params.value) + wormholesOf(ctx.game, ctx.pack, slot, ctx.shared.wormholeTokens).length;
      },
    },
  ],
};
