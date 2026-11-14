/**
 * Major Entropic Field (frontier exploration, Prophecy of Kings): "Gain 1 command token and 3 trade goods."
 *
 * Decided: `play`, named in the `uses` of the entry that explores (35.5, 35.7): the owner gains one command token into a
 * pool of their choice (20.2) and three trade goods. A token beyond the sixteen of a faction is warned of as any gain is
 * (`noReinforcements`, 20.3). Pass 2: written.
 */
import { tokens, tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:majent';

const POOLS = ['tactic', 'fleet', 'strategy'] as const;
type Pool = (typeof POOLS)[number];
const pool = (value: string | number | undefined): Pool => POOLS.find(p => p === value) ?? 'tactic';
const NAMES = {
  tactic: { ru: 'Тактический резерв', en: 'Tactic pool' },
  fleet: { ru: 'Резерв флота', en: 'Fleet pool' },
  strategy: { ru: 'Стратегический резерв', en: 'Strategy pool' },
};

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'pool', kind: 'option', label: { ru: 'В какой резерв', en: 'Into which pool' }, options: () => [...POOLS], names: NAMES }],
  holder: 'self',
  play: ctx => [tokens(ctx.holder, { [pool(ctx.choices.pool)]: 1 }, 'component'), tradeGoods(ctx.holder, 3)],
};
