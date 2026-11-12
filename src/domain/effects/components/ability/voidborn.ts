/**
 * Voidborn (Empyrean, ability):
 * Nebulae do not affect your ships' movement
 *
 * A passive waiver, red in pass 1: a nebula neither ends an Empyrean route (59.1, `routeBlocked` for a nebula only)
 * nor slows a ship that starts in it (59.2, the move value of a route that starts in a nebula is the ship's own).
 * Decided: the waiver is narrowed to a nebula (ships of other players in it still block, 58.3.2), and the start in a
 * nebula keeps the move value through the point `nebulaStart`.
 */
import { blockedByShips, routeBlockKind } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'ability:voidborn';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'routeBlocked',
    rule: "Nebulae do not affect your ships' movement",
    when: (warning, ctx) => routeBlockKind(warning, ctx) === 'nebula' && !blockedByShips(ctx, String(warning.params.systemId)),
  }],
  modify: { nebulaStart: (_value, ctx) => ctx.speed },
};
