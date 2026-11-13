/**
 * The Table's Grace (Mentak Coalition, breakthrough): "If you have the Cruiser II unit upgrade technology, flip this
 * card and place it on top of cruiser II. Corsair [Cost 2, Combat 6, Move 3, Capacity 2] If the active system
 * contains another player's non-fighter ships, this unit can move through systems that contain other players'
 * ships."
 *
 * Decided: a passive mix, in force once the breakthrough is held together with Cruiser II (the card is flipped onto
 * it). The Corsair's numbers are a `modify` of the cruiser (Capacity 2 over the 1 of Cruiser II; Move 3 and Cost 2
 * as Cruiser II has them), and its ability waives `routeBlocked` for a move of Corsairs while the active system
 * holds another player's non-fighter ships (faction note 1: through the ships of any player).
 *
 * Pass 2: capacity 2 for a cruiser that already has capacity (Cruiser II owned: the value so far is 1; order of the
 * registry puts technologies before breakthroughs), and a waiver of `routeBlocked` narrowed to ships blocking a move of
 * cruisers alone while Cruiser II is owned and the active system holds another player's non-fighter ships.
 */
import { componentById } from '../../../components';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';


export const id = 'breakthrough:mentakbt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { capacity: (value, ctx) => (ctx.unit === 'cruiser' && value >= 1 ? 2 : value) },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'routeBlocked',
    rule: "If the active system contains another player's non-fighter ships, this unit can move through systems that contain other players' ships.",
    when: (warning, ctx) => {
      const upgrade = componentById(ctx.pack, 'technology:cr2');
      const active = ctx.entry?.type === 'tactical' ? ctx.entry.systemId ?? undefined : undefined;
      return upgrade !== undefined && active !== undefined && ctx.had.holds(upgrade.id)
        && ctx.routeBlockKind(warning) === 'ships'
        && ctx.onlyUnits(warning, ['cruiser'])
        && Object.keys(ctx.othersShipsIn(active)).length > 0;
    },
  }],
};
