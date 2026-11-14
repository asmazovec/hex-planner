/**
 * Letani Ospha (Arborec, agent): "ACTION: Exhaust this card and choose a player's non-fighter ship: that player may
 * replace that ship with one from their reinforcements that costs up to 2 more than the replaced ship."
 *
 * A `play` with the choices of its component action (the system, the ship replaced, the ship placed): the one ship
 * leaves and the other stands in its place, not produced (Arborec note 1), and a replacement that costs more than 2
 * above the replaced ship is warned of. The replay exhausts the agent. Only my own ships are chosen here: another
 * player's board is not reached from my entry.
 */
import replacementCost from '../../../rules/codes/replacementCost';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import { violation } from '../../../rules/registry';
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:arborecagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'systemId', kind: 'system' },
    {
      key: 'ship', kind: 'unit', label: { ru: 'Заменяемый корабль', en: 'Ship replaced' },
      options: ctx => Object.entries(ctx.state.systems[String(ctx.chosen.systemId ?? '')] ?? {})
        .filter(([unit, count]) => count > 0 && ctx.pack.units[unit as UnitId]?.move != null && !ctx.pack.units[unit as UnitId]?.ground && !ctx.pack.units[unit as UnitId]?.fighter)
        .map(([unit]) => unit),
    },
    { key: 'replacement', kind: 'unit', label: { ru: 'Новый корабль', en: 'Ship placed' }, options: ctx => Object.values(ctx.pack.units).filter(u => u.move != null && !u.ground && !u.fighter).map(u => u.id) },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const systemId = String(ctx.choices.systemId ?? '');
    const ship = String(ctx.choices.ship ?? '') as UnitId | '';
    const replacement = String(ctx.choices.replacement ?? '') as UnitId | '';
    if (systemId === '' || ship === '' || replacement === '') return [];
    if ((ctx.my.unitsIn(systemId)[ship] ?? 0) < 1 || ctx.pack.units[ship]?.fighter) {
      ctx.warn(violation(componentUnresolved.code, { id, name: 'Letani Ospha', reason: 'no such non-fighter ship in the system' }));
      return [];
    }
    // "costs up to 2 more than the replaced ship"
    if (ctx.unitCost({ [replacement]: 1 }) - ctx.unitCost({ [ship]: 1 }) > 2) ctx.warn(violation(replacementCost.code, {}));
    return [removeUnits(ctx.holder, { slot: systemId }, { [ship]: 1 }), placeUnits(ctx.holder, { slot: systemId }, { [replacement]: 1 })];
  },
};
