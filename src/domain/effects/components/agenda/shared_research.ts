/**
 * Shared Research (agenda): "For: Each player's units can move through nebulae. Against: Each player places a
 * command token from their reinforcements in their home system, if able."
 *
 * A passive waiver of `routeBlocked` for a nebula passed through: "Each player's units can move through nebulae". A
 * nebula still ends a move that enters it only as the active system, and a ship starting in a nebula still moves 1
 * (Shared Research notes 1 and 2), so `speedShort` stands.
 */
import { hasAnomaly } from '../../../replay/board';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:shared_research';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'routeBlocked',
    rule: "Each player's units can move through nebulae.",
    when: (warning, ctx) => hasAnomaly(ctx.game, String(warning.params.systemId), 'nebula', ctx.pack),
  }],
};
