/**
 * Auto-Factories (Emirates of Hacan, breakthrough, Thunder's Edge): "When you produce 3 or more non-fighter ships,
 * place 1 command token from your reinforcements into your fleet pool."
 *
 * Decided: `passive` once the breakthrough is held: a production of three or more non-fighter ships in one use of
 * PRODUCTION puts one token into the fleet pool. Fighters and ground forces do not count. It needs a point of the
 * count asked by the production step. Built on the hook `onProduced` (points/moments.ts); the token is gained with the checks of a fleet pool (`gainTokens`).
 */
import { gain } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { UnitId } from '../../../types';

export const id = 'breakthrough:hacanbt';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'self',
  on: {
    onProduced: (ctx, made) => {
      const ships = (Object.keys(made.units) as UnitId[]).filter(unit => unit !== 'fighter' && ctx.pack.units[unit] !== undefined && !ctx.pack.units[unit]!.ground);
      if (ships.reduce((sum, unit) => sum + (made.units[unit] ?? 0), 0) >= 3) return [gain.tokens(ctx.holder, { fleet: 1 }, 'production')];
    },
  },
};
