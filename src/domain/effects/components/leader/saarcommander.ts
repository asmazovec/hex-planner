/**
 * Rowl Sarrig (Clan of Saar, commander): "When you produce fighters or infantry: You may place each of those units at
 * any of your space docks that are not blockaded."
 *
 * Decided (pass 2 to build): a passive waiver of `productionPlace` (68.3: produced ground forces go on the planet of
 * the producing dock), narrowed by `when` to a planet in a system that holds a space dock of mine not blockaded (the dock's planet itself is never warned of), and to a planet
 * where only infantry were placed. A mech placed there is still warned of. Fighters placed at another dock's space
 * area have no field in the entry yet.
 */
import { systemOfPlanet } from '../../../stacks';
import { unitIds } from '../../../replay/state';
import { othersShipsIn } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'leader:saarcommander';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'productionPlace',
    rule: 'You may place each of those units at any of your space docks that are not blockaded.',
    when: (warning, ctx) => {
      const planetId = String(warning.params.planetId);
      const placed = ctx.entry && 'productionGround' in ctx.entry ? ctx.entry.productionGround?.[planetId] : undefined;
      // Infantry only (a mech is still warned of), onto a planet that holds a dock of mine.
      if (!placed || !unitIds(placed).every(unit => unit === 'infantry')) return false;
      // A dock of mine in the system of the planet: the planet itself holds none (else nothing is warned of), so another planet of the system does.
      const slot = systemOfPlanet(ctx.game, planetId, ctx.pack);
      if (slot === undefined || !ctx.before.docks.some(dock => systemOfPlanet(ctx.game, dock, ctx.pack) === slot)) return false;
      // Blockaded: other players' ships in the dock's system and none of mine.
      const mine = unitIds(ctx.before.systems[slot] ?? {}).some(unit => !ctx.pack.units[unit]?.ground);
      return mine || Object.keys(othersShipsIn(ctx, slot)).length === 0;
    },
  }],
};
