/**
 * Tungstantus (Titans of Ul, commander): "When 1 or more of your units use PRODUCTION: You may gain 1 trade good."
 *
 * Decided: `play`, named in `uses` of the entry whose production triggers it: the entry gains 1 trade good. A trade
 * good is gained only if at least one unit is produced (Titans of Ul, Tungstantus note 1.2), and a commander is not
 * exhausted by its use.
 */
import type { ComponentEffect } from '../../types';
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:titanscommander';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    // Note 1.2: no trade good unless at least one unit is produced.
    if (ctx.entry?.type !== 'tactical') return [];
    const produced = Object.values(ctx.entry.production).reduce((sum, n) => sum + (n ?? 0), 0);
    return produced > 0 ? [tradeGoods(ctx.holder, 1)] : [];
  },
};
