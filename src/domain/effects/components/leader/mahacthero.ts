/**
 * Airo Shir Aur, Benediction (Mahact, hero):
 * ACTION: Move all units in the space area of any system to an adjacent system that contains a different
 * player's ships. Space combat is resolved in that system. neither player can retreat or resolve abilities that
 * would move their ships. Then, purge this card.
 *
 * A play, red in pass 1: the component action moves every unit of the space area of one system to an adjacent one
 * that holds another player's ships (`choices.from`, `choices.to`); the replay already purges the hero.
 * Decided (pass 2): `play` with two system choices. Every unit of my space area in `from` is added to `to`; a system
 * chosen as both, or none chosen, does nothing. A `to` that holds no other player's ships is warned of (componentCondition); whether it is adjacent is not
 * checked; the battle is the player's, entered as losses of a later entry.
 */
import { componentById } from '../../../components';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { UnitCounts } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'leader:mahacthero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'from', kind: 'system', label: { ru: 'Откуда', en: 'From' } },
    { key: 'to', kind: 'system', label: { ru: 'Куда', en: 'To' } },
  ],
  play: ({ state, states, player, pack, choices, warnings, held }) => {
    const from = choices.from === undefined ? undefined : String(choices.from);
    const to = choices.to === undefined ? undefined : String(choices.to);
    if (from === undefined || to === undefined || from === to) return;
    // The target must hold a different player's ships; whether it is adjacent is not checked.
    const others = Object.entries(states).some(([owner, each]) => owner !== player && Object.values(each.systems[to] ?? {}).some(count => (count ?? 0) > 0));
    if (held && !others) warnings.push(violation(componentCondition.code, { id, name: componentById(pack, id)?.name ?? id, condition: "a different player's ships" }));
    const moving = state.systems[from];
    if (!moving) return;
    const arrived: UnitCounts = { ...(state.systems[to] ?? {}) };
    for (const [unit, count] of Object.entries(moving) as [keyof UnitCounts, number][]) {
      if (count > 0) arrived[unit] = (arrived[unit] ?? 0) + count;
    }
    state.systems[to] = arrived;
    delete state.systems[from];
  },
};
