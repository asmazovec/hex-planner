/**
 * Aeurex Mechanica (Industrex, Thunder's Edge): "You may exhaust this card when you pass to place 1 ship that matches
 * a unit upgrade technology you own from your reinforcements into a system that contains your ships."
 *
 * Decided: `play`. Named in the `uses` of a pass entry with the choices `unit` and `system`, it places that ship. A
 * ship whose unit upgrade is not owned, a system without the player's ships, an entry that is not a pass, and a ship
 * beyond the reinforcements (`reinforcementsOut`) are warned of (`componentCondition`), and the ship is placed all the
 * same. It also checks LRR 53.3 with 53.2: the card lies in the play area of whoever controls Industrex.
 */
import { componentById } from '../../../components';
import { upgradeTech } from '../../../holdings';
import { unitLimitWarnings } from '../../../replay/production';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { UnitCounts, UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:industrex';

/** Ships: units that are not ground forces, and that a unit upgrade technology exists for. */
const SHIPS: UnitId[] = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'fighter', 'warsun'];

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'unit', kind: 'unit', label: { ru: 'Поставить с Aeurex Mechanica', en: 'Placed with Aeurex Mechanica' },
      options: ({ pack, game, state }) => SHIPS.filter(unit => {
        const upgrade = upgradeTech(pack, game.faction, unit);
        return pack.units[unit] !== undefined && upgrade !== undefined && state.holdings.technologies.includes(upgrade);
      }),
    },
    {
      key: 'system', kind: 'system', label: { ru: 'В системе', en: 'In the system' },
      options: ({ state, pack }) => Object.entries(state.systems)
        .filter(([, units]) => Object.entries(units).some(([unit, count]) => (count ?? 0) > 0 && pack.units[unit as UnitId]?.ground === false))
        .map(([slot]) => slot),
    },
  ],
  play: turn => {
    const { state, choices, pack, warnings, entry, game } = turn;
    const name = componentById(pack, id)?.name ?? id;
    const condition = (text: string) => warnings.push(violation(componentCondition.code, { id, name, condition: text }));
    if (state.control.industrex !== 'me') warnings.push(violation('componentNotHeld', { id, name }));
    if (entry.type !== 'pass') condition('only when you pass');
    const unit = SHIPS.find(ship => ship === choices.unit);
    const system = typeof choices.system === 'string' ? choices.system : undefined;
    if (unit === undefined || system === undefined) return;
    const upgrade = upgradeTech(pack, game.faction, unit);
    if (upgrade === undefined || !state.holdings.technologies.includes(upgrade)) condition('a unit upgrade technology you own for this ship');
    const ships = Object.entries(state.systems[system] ?? {}).some(([kind, count]) => (count ?? 0) > 0 && pack.units[kind as UnitId]?.ground === false);
    if (!ships) condition('a system that contains your ships');
    const placed: UnitCounts = { [unit]: 1 };
    warnings.push(...unitLimitWarnings(state, placed, pack, 'component'));
    const here = (state.systems[system] ??= {});
    here[unit] = (here[unit] ?? 0) + 1;
  },
};
