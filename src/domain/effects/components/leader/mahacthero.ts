/**
 * Airo Shir Aur, Benediction (Mahact, hero):
 * ACTION: Move all units in the space area of any system to an adjacent system that contains a different
 * player's ships. Space combat is resolved in that system. neither player can retreat or resolve abilities that
 * would move their ships. Then, purge this card.
 *
 * A play, red in pass 1: the component action moves every unit of the space area of one system to an adjacent one
 * that holds another player's ships (`choices.from`, `choices.to`); the replay already purges the hero.
 * Decided (pass 2): `play` with two system choices. Every unit of my space area in `from` is added to `to`; a system
 * chosen as both, or none chosen, does nothing. Whether `to` is adjacent and holds another player's ships is not
 * checked (no code names it); the battle is the player's, entered as losses of a later entry.
 */
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
  play: ({ state, choices }) => {
    const from = choices.from === undefined ? undefined : String(choices.from);
    const to = choices.to === undefined ? undefined : String(choices.to);
    if (from === undefined || to === undefined || from === to) return;
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
