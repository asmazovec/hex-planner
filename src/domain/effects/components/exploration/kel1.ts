/**
 * Keleres Ship (frontier exploration, Prophecy of Kings): "Gain 2 command tokens."
 *
 * Decided: `play`, named in the `uses` of the entry that explores (35.5, 35.7): the owner gains two command tokens into
 * pools of their choice (20.2). Tokens beyond the sixteen of a faction are warned of as any gain is (`noReinforcements`,
 * 20.3). Pass 2: written.
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:kel1';

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
  choose: [{ key: 'first', kind: 'option', label: { ru: 'Первый жетон в резерв', en: 'First token into' }, options: () => [...POOLS], names: NAMES }, { key: 'second', kind: 'option', label: { ru: 'Второй жетон в резерв', en: 'Second token into' }, options: () => [...POOLS], names: NAMES }],
  holder: 'self',
  play: ctx => [tokens(ctx.holder, { [pool(ctx.choices.first)]: 1 }, 'component'), tokens(ctx.holder, { [pool(ctx.choices.second)]: 1 }, 'component')],
};
