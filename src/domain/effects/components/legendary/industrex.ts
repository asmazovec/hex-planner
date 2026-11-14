/**
 * Aeurex Mechanica (Industrex, Thunder's Edge): "You may exhaust this card when you pass to place 1 ship that matches
 * a unit upgrade technology you own from your reinforcements into a system that contains your ships."
 *
 * Decided: `play`. Named in the `uses` of a pass entry with the choices `unit` and `system`, it places that ship. A
 * ship whose unit upgrade is not owned, a system without the player's ships, an entry that is not a pass, and a ship
 * beyond the reinforcements (`reinforcementsOut`) are warned of (`componentCondition`), and the ship is placed all the
 * same. It also checks LRR 53.3 with 53.2: the card lies in the play area of whoever controls Industrex.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import { upgradeTech } from '../../../holdings';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { UnitCounts, UnitId } from '../../../types';
import { requireControlBy, shipsOf } from '../../helpers/cardPlay';
import { systemsWithUnits } from '../../helpers/choices';

export const id = 'legendary:industrex';

/** Ships: units that are not ground forces, and that a unit upgrade technology exists for. */
const SHIPS: UnitId[] = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'warsun'];

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'unit', kind: 'unit', label: { ru: 'Поставить с Aeurex Mechanica', en: 'Placed with Aeurex Mechanica' },
      options: ({ pack, my }) => SHIPS.filter(unit => {
        const upgrade = upgradeTech(pack, my.faction, unit);
        return pack.units[unit] !== undefined && upgrade !== undefined && my.holds(upgrade);
      }),
    },
    {
      key: 'system', kind: 'system', label: { ru: 'В системе', en: 'In the system' },
      options: ctx => systemsWithUnits(ctx, unit => ctx.pack.units[unit as UnitId]?.ground === false),
    },
  ],
  holder: 'self',
  play: ctx => {
    const name = componentById(ctx.pack, id)?.name ?? id;
    const condition = (text: string) => ctx.warn(violation(componentCondition.code, { id, name, condition: text }));
    requireControlBy(ctx, 'industrex');
    if (ctx.entry?.type !== 'pass') condition('only when you pass');
    const unit = SHIPS.find(ship => ship === ctx.choices.unit);
    const system = typeof ctx.choices.system === 'string' ? ctx.choices.system : undefined;
    if (unit === undefined || system === undefined) return [];
    const upgrade = upgradeTech(ctx.pack, ctx.my.faction, unit);
    if (upgrade === undefined || !ctx.my.holds(upgrade)) condition('a unit upgrade technology you own for this ship');
    if (shipsOf(ctx, ctx.holder, system) === 0) condition('a system that contains your ships');
    const placed: UnitCounts = { [unit]: 1 };
    ctx.unitLimit(placed, 'component').forEach(ctx.warn);
    return [placeUnits(ctx.holder, { slot: system }, placed)];
  },
};
