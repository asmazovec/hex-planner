/**
 * Nekro Malleon (Nekro Virus, agent): "During the action phase: You may exhaust this card to choose a player: that
 * player may discard 1 action card or spend 1 command token from their command sheet to gain 2 trade goods."
 *
 * A `play` effect with the choices `player` (`me` or an opponent id), `pay` (`token` or `actionCard`) and, for a token,
 * `pool` (`tactic`, `fleet`, `strategy`). The chosen player spends the token (a discarded card is entered in `spends`,
 * which the replay takes from my hand) and gains 2 trade goods. The agent is exhausted as every agent is.
 */
import { tokens, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:nekroagent';

const POOLS = ['tactic', 'fleet', 'strategy'] as const;

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'player', kind: 'player', self: true },
    {
      key: 'pay', kind: 'option', label: { ru: 'Платёж', en: 'Payment' }, options: () => ['token', 'actionCard'],
      names: { token: { ru: 'Жетон', en: 'Command token' }, actionCard: { ru: 'Карта действия', en: 'Action card' } },
    },
    {
      key: 'pool', kind: 'option', label: { ru: 'Резерв', en: 'Pool' }, options: () => [...POOLS], when: chosen => chosen.pay === 'token',
      names: { tactic: { ru: 'Тактический', en: 'Tactic' }, fleet: { ru: 'Флот', en: 'Fleet' }, strategy: { ru: 'Стратегический', en: 'Strategy' } },
    },
  ],
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const who = ctx.playerOf(String(ctx.choices.player ?? 'me'));
    if (who === undefined) return [];
    const events = [];
    if (ctx.choices.pay === 'token') {
      const pool = POOLS.find(name => name === ctx.choices.pool);
      if (!pool) return [];
      events.push(tokens(who, { [pool]: -1 }));
    } else if (ctx.choices.pay !== 'actionCard') return [];
    return [...events, tradeGoods(who, 2)];
  },
};
