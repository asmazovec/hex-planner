/**
 * Rowl Sarrig (Clan of Saar, commander): "When you produce fighters or infantry: You may place each of those units at
 * any of your space docks that are not blockaded."
 *
 * Decided (pass 2 to build): a passive waiver of `productionPlace` (68.3: produced ground forces go on the planet of
 * the producing dock), narrowed by `when` to a planet in a system that holds a space dock of mine not blockaded (the dock's planet itself is never warned of), and to a planet
 * where only infantry were placed. A mech placed there is still warned of. Fighters placed at another dock's space
 * area have no field in the entry yet.
 */
import { unitIds } from '../../../replay/state';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:saarcommander';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'productionPlace',
    rule: 'You may place each of those units at any of your space docks that are not blockaded.',
    when: (warning, ctx) => {
      const planetId = String(warning.params.planetId);
      const placed = ctx.entry && 'productionGround' in ctx.entry ? ctx.entry.productionGround?.[planetId] : undefined;
      // Infantry only (a mech is still warned of), onto a planet that holds a dock of mine.
      if (!placed || !unitIds(placed).every(unit => unit === 'infantry')) return false;
      // A dock of mine in the system of the planet: the planet itself holds none (else nothing is warned of), so another planet of the system does.
      const slot = ctx.systemOf(planetId);
      if (slot === undefined || !ctx.prior.my.planets().some(planet => (planet.structures.spacedock ?? 0) > 0 && ctx.systemOf(planet.id) === slot)) return false;
      // Blockaded: other players' ships in the dock's system and none of mine.
      const mine = unitIds(ctx.prior.my.unitsIn(slot)).some(unit => !ctx.pack.units[unit]?.ground);
      return mine || Object.keys(ctx.othersShipsIn(slot)).length === 0;
    },
  }],
};
