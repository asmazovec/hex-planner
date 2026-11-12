/**
 * Minor Entropic Field (frontier exploration, Prophecy of Kings): "Gain 1 command token and 1 trade good."
 *
 * Decided: `play`, named in the `uses` of the entry that explores (35.5, 35.7): the owner gains one command token into a
 * pool of their choice (20.2) and one trade good. A token beyond the sixteen of a faction is warned of as any gain is
 * (`noReinforcements`, 20.3). Pass 2: written.
 */
import { gainTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:minent';

const POOLS = ['tactic', 'fleet', 'strategy'] as const;
type Pool = (typeof POOLS)[number];
const pool = (value: string | number | undefined): Pool => POOLS.find(p => p === value) ?? 'tactic';
const NAMES = {
  tactic: { ru: 'Тактический резерв', en: 'Tactic pool' },
  fleet: { ru: 'Резерв флота', en: 'Fleet pool' },
  strategy: { ru: 'Стратегический резерв', en: 'Strategy pool' },
};

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'pool', kind: 'option', label: { ru: 'В какой резерв', en: 'Into which pool' }, options: () => [...POOLS], names: NAMES }],
  play: turn => {
    gainTokens(turn, { [pool(turn.choices.pool)]: 1 });
    turn.state.tradeGoods += 1;
  },
};
