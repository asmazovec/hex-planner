/**
 * Voidborn (Empyrean, ability):
 * Nebulae do not affect your ships' movement
 *
 * A passive waiver, red in pass 1: a nebula neither ends an Empyrean route (59.1, `routeBlocked` for a nebula only)
 * nor slows a ship that starts in it (59.2, the move value of a route that starts in a nebula is the ship's own).
 * Decided: the waiver is narrowed to a nebula (ships of other players in it still block, 58.3.2), and the start in a
 * nebula keeps the move value through the point `nebulaStart`.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'ability:voidborn';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { nebulaStart: (_value, ctx) => ctx.speed },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'routeBlocked',
    rule: "Nebulae do not affect your ships' movement",
    when: (warning, ctx) => ctx.routeBlockKind(warning) === 'nebula' && !ctx.blockedByShips(String(warning.params.systemId)),
  }],
};
