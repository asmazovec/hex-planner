/**
 * Tungstantus (Titans of Ul, commander): "When 1 or more of your units use PRODUCTION: You may gain 1 trade good."
 *
 * Decided: `play`, named in `uses` of the entry whose production triggers it: the entry gains 1 trade good. A trade
 * good is gained only if at least one unit is produced (Titans of Ul, Tungstantus note 1.2), and a commander is not
 * exhausted by its use.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:titanscommander';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ entry, state }) => {
    // Note 1.2: no trade good unless at least one unit is produced.
    if (entry.type !== 'tactical') return;
    const produced = Object.values(entry.production).reduce((sum, n) => sum + (n ?? 0), 0);
    if (produced > 0) state.tradeGoods += 1;
  },
};
