/**
 * Fabrication (Naaz-Rokha Alliance): "ACTION: Either purge 2 of your relic fragments of the same type to gain 1 relic;
 * or purge 1 of your relic fragments to gain 1 command token."
 *
 * A `play`: the ability is played by a component action, and its choice `gain: 'token'` with `pool`
 * (`tactic`, `fleet` or `strategy`) puts one command token in that pool. The relic of the other choice is entered in
 * «Взято и сброшено», as every relic gained. The fragments are exploration cards, which the plan does not hold, so
 * their purge is not counted (Naaz-Rokha, Fabrication note 2: the fragment may be purged even with no token in the
 * reinforcements).
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:fabrication';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'gain', kind: 'option', options: () => ['token', 'relic'],
      names: { token: { ru: 'Жетон', en: 'Command token' }, relic: { ru: 'Реликвия', en: 'Relic' } },
      label: { ru: 'Что получить', en: 'Gain' },
    },
    {
      key: 'pool', kind: 'option', options: () => ['tactic', 'fleet', 'strategy'], when: chosen => chosen.gain === 'token',
      names: { tactic: { ru: 'Тактический резерв', en: 'Tactic pool' }, fleet: { ru: 'Резерв флота', en: 'Fleet pool' }, strategy: { ru: 'Стратегический резерв', en: 'Strategy pool' } },
      label: { ru: 'Куда положить', en: 'Pool' },
    },
  ],
  play: ({ game, state, choices }) => {
    // A sheet ability is not checked by `holds`: another faction's play does nothing.
    if (game.faction !== 'naaz' || choices.gain !== 'token') return;
    const pool = choices.pool;
    if (pool === 'tactic' || pool === 'fleet' || pool === 'strategy') state[pool] += 1;
  },
};
