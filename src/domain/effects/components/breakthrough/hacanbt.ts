/**
 * Auto-Factories (Emirates of Hacan, breakthrough, Thunder's Edge): "When you produce 3 or more non-fighter ships,
 * place 1 command token from your reinforcements into your fleet pool."
 *
 * Decided: `passive` once the breakthrough is held: a production of three or more non-fighter ships in one use of
 * PRODUCTION puts one token into the fleet pool. Fighters and ground forces do not count. It needs a point of the
 * count asked by the production step. Built on the hook `onProduced` (points/moments.ts); the token is gained with the checks of a fleet pool (`gainTokens`).
 */
import { gainTokens } from '../../../replay/status';
import '../../points/moments';
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:hacanbt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  onProduced: turn => {
    const ships = (Object.keys(turn.units) as UnitId[]).filter(unit => unit !== 'fighter' && turn.pack.units[unit] !== undefined && !turn.pack.units[unit]!.ground);
    if (ships.reduce((sum, unit) => sum + (turn.units[unit] ?? 0), 0) >= 3) gainTokens(turn, { fleet: 1 }, 'production');
  },
};
