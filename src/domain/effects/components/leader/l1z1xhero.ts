/**
 * The Helmsman, Dark Space Navigation (L1Z1X Mindnet, hero): "ACTION: Choose 1 system that does not contain other
 * players' ships. you may move your flagship and any number of your dreadnoughts from other systems into the chosen
 * system. Then, purge this card."
 *
 * Decided: a `play` of a component action with choices: the chosen system (`system`) and the ships taken to it
 * (`dreadnought@<slot>`, `flagship@<slot>`: how many from that system). The ships move straight there, with no route
 * and no move value (faction note 3), and only flagships and dreadnoughts move. A chosen system with other players'
 * ships is warned of. The replay already purges the hero. Pass 2 writes the move and the check.
 *
 * Pass 2: `play` with `moveUnits` (the ships fly as entered; a missing one is `unitsMissing`) and the check
 * `systemOccupied`. Only the system can be chosen on the screen (the choices declare no per-system ship counts); with no
 * `<unit>@<slot>` choice at all the play takes the flagship and every dreadnought of the other systems.
 */
import systemOccupied from '../../../rules/codes/systemOccupied';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { UnitCounts } from '../../../types';
import { missingBy, othersHaveShips } from '../../helpers/cardPlay';

const SHIPS = ['flagship', 'dreadnought'] as const;

export const id = 'leader:l1z1xhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.my.faction !== 'l1z1x') return [];
    const target = ctx.choices.system;
    if (typeof target !== 'string') return [];
    if (othersHaveShips(ctx, target)) ctx.warn(violation(systemOccupied.code, {}));
    const named = Object.entries(ctx.choices).flatMap(([key, count]) => {
      const [unit, from] = key.split('@');
      return (SHIPS as readonly string[]).includes(unit) && from !== undefined && from !== target && typeof count === 'number' && count > 0
        ? [{ from, units: { [unit]: count } as UnitCounts }] : [];
    });
    const everything = Object.keys(ctx.choices).some(key => key.includes('@')) ? [] : Object.keys({ ...ctx.table.map, ...ctx.board.common.fracture.tiles }).flatMap(from => {
      const units = ctx.my.unitsIn(from);
      const ships: UnitCounts = {};
      for (const unit of SHIPS) if (from !== target && (units[unit] ?? 0) > 0) ships[unit] = units[unit];
      return Object.keys(ships).length > 0 ? [{ from, units: ships }] : [];
    });
    // What was asked for flies all the same: a shortfall at the source is told, and the source only ends empty.
    return [...named, ...everything].flatMap(({ from, units }) => [removeUnits(ctx.holder, { slot: from }, missingBy(ctx, from, units)), placeUnits(ctx.holder, { slot: target }, units)]);
  },
};
