/**
 * Nekro Malleon (Nekro Virus, agent): "During the action phase: You may exhaust this card to choose a player: that
 * player may discard 1 action card or spend 1 command token from their command sheet to gain 2 trade goods."
 *
 * A `play` effect with the choices `player` (`me` or an opponent id), `pay` (`token` or `actionCard`) and, for a token,
 * `pool` (`tactic`, `fleet`, `strategy`). The chosen player spends the token (a discarded card is entered in `spends`,
 * which the replay takes from my hand) and gains 2 trade goods. The agent is exhausted as every agent is.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nekroagent';

const POOLS = ['tactic', 'fleet', 'strategy'] as const;

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'player', kind: 'player' },
    {
      key: 'pay', kind: 'option', label: { ru: 'Платёж', en: 'Payment' }, options: () => ['token', 'actionCard'],
      names: { token: { ru: 'Жетон', en: 'Command token' }, actionCard: { ru: 'Карта действия', en: 'Action card' } },
    },
    {
      key: 'pool', kind: 'option', label: { ru: 'Резерв', en: 'Pool' }, options: () => [...POOLS], when: chosen => chosen.pay === 'token',
      names: { tactic: { ru: 'Тактический', en: 'Tactic' }, fleet: { ru: 'Флот', en: 'Fleet' }, strategy: { ru: 'Стратегический', en: 'Strategy' } },
    },
  ],
  play: ({ choices, states, held }) => {
    if (!held) return;
    const who = states[String(choices.player ?? 'me')];
    if (!who) return;
    if (choices.pay === 'token') {
      const pool = POOLS.find(name => name === choices.pool);
      if (!pool) return;
      who[pool] -= 1;
    } else if (choices.pay !== 'actionCard') return;
    who.tradeGoods += 2;
  },
};
