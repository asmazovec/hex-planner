/**
 * Production Biomes (Emirates of Hacan, technology): "ACTION: Exhaust this card and spend 1 token from your strategy
 * pool to gain 4 trade goods and choose 1 other player; that player gains 2 trade goods."
 *
 * Decided: `play`, a component action with the choice `player` (exhausted already, its text says so): one strategy
 * token spent (`shortStrategy` when the pool is empty), 4 trade goods to the Hacan, 2 to the chosen player. Pass 1:
 * still the hint it is today.
 */
import { spendStrategyTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';

export const id = 'technology:pm';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  play: turn => {
    const { state, states, choices, held } = turn;
    if (!held) return;
    spendStrategyTokens(turn);
    state.tradeGoods += 4;
    const other = typeof choices.player === 'string' ? states[choices.player] : undefined;
    if (other && other !== state) other.tradeGoods += 2;
  },
};
