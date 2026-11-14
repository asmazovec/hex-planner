/**
 * Yin Spinner Omega (Yin, faction technology): "After you produce units, place up to 2 infantry from your
 * reinforcements on any planet you control or in any space area that contains 1 or more of your ships."
 *
 * Decided: a `play` named in `uses` of an entry that produces. The infantry are placed, not produced: no cost, no
 * Production value, no dock. They go to the planet of the choice `place` (a planet id, or a slot of the map for a
 * space area), `count` of them (1 or 2; 1 when not set, as the stepper shows). The interface asks a planet (`place`) or,
 * while no planet is chosen, a system (`space`). A planet the Yin do not control, or a space area with none of their
 * ships, gets nothing and is warned of (`placeNotControlled`, 67.4.1; `componentUnresolved` for the space area).
 * An entry that produces nothing places nothing: "After you produce units" is the trigger. Reinforcements are not counted.
 */
import { componentById } from '../../../components';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { violation } from '../../../rules/registry';
import { unitIds } from '../../../replay/state';
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';
import { controlledPlanets, systemsWithUnits } from '../../helpers/choices';

export const id = 'technology:yso';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'place', kind: 'planet', label: { ru: 'Планета', en: 'Planet' }, options: controlledPlanets },
    {
      key: 'space', kind: 'system', label: { ru: 'Космос системы', en: 'Space area' }, when: chosen => chosen.place === undefined,
      options: ctx => systemsWithUnits(ctx, unit => ctx.pack.units[unit as UnitId]?.ground !== true),
    },
    { key: 'count', kind: 'number', range: [1, 2], label: { ru: 'Сколько пехоты', en: 'How many infantry' } },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    const produced = entry?.type === 'tactical' && Object.values(entry.production ?? {}).some(count => (count ?? 0) > 0);
    const where = ctx.choices.place ?? ctx.choices.space;
    if (!ctx.held || !produced || where === undefined) return [];
    const place = String(where);
    const units = { infantry: Math.min(2, Math.max(0, Number(ctx.choices.count ?? 1))) };
    if (ctx.pack.planets[place] !== undefined) {
      if (ctx.board.planets[place]?.owner !== ctx.holder) ctx.warn(violation(placeNotControlled.code, { planetId: place }));
      else return [placeUnits(ctx.holder, { planet: place }, units)];
    } else if (ctx.table.map[place] !== undefined || ctx.board.common.fracture.tiles[place] !== undefined) {
      if (!unitIds(ctx.my.unitsIn(place)).some(unit => (ctx.my.unitsIn(place)[unit] ?? 0) > 0 && ctx.pack.units[unit]?.ground !== true)) {
        ctx.warn(violation(componentUnresolved.code, { id, name: componentById(ctx.pack, id)?.name ?? id, reason: 'no ship of yours in that space area' }));
      } else return [placeUnits(ctx.holder, { slot: place }, units)];
    }
    return [];
  },
};
