/**
 * Production Biomes (Emirates of Hacan, technology): "ACTION: Exhaust this card and spend 1 token from your strategy
 * pool to gain 4 trade goods and choose 1 other player; that player gains 2 trade goods."
 *
 * Decided: `play`, a component action with the choice `player` (exhausted already, its text says so): one strategy
 * token spent (`shortStrategy` when the pool is empty), 4 trade goods to the Hacan, 2 to the chosen player. Pass 1:
 * still the hint it is today.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { spendStrategyBy } from '../../helpers/cardPlay';

export const id = 'technology:pm';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const events = [...spendStrategyBy(ctx), tradeGoods(ctx.holder, 4)];
    const other = typeof ctx.choices.player === 'string' ? ctx.playerOf(ctx.choices.player) : undefined;
    return other !== undefined && other !== ctx.holder ? [...events, tradeGoods(other, 2)] : events;
  },
};
