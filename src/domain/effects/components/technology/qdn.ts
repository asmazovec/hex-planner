/**
 * Quantum Datahub Node (Emirates of Hacan, technology): "At the end of the strategy phase, you may spend 1 token from
 * your strategy pool and give another player 3 of your trade goods. If you do, give 1 of your strategy cards to that
 * player and take 1 of their strategy cards."
 *
 * Decided: `play`, a component entry of the strategy phase with the choice `player`: one strategy token spent
 * (`shortStrategy`), three trade goods given to that player (`shortTradeGoods` when the Hacan has fewer: they must
 * have three before spending the token, Hacan note 3). The exchange of strategy cards is not modelled: the other
 * players' cards are not planned. Pass 1: still the hint it is today.
 */
import { spendTradeGoods } from '../../../replay/payment';
import { spendStrategyTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';

export const id = 'technology:qdn';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  // The exchange of strategy cards is not replayed: the other players' cards are not planned.
  play: turn => {
    const { state, states, choices, warnings, held } = turn;
    if (!held) return;
    spendStrategyTokens(turn);
    const given = Math.min(3, state.tradeGoods);
    spendTradeGoods(state, 3, warnings, 'component');
    const other = typeof choices.player === 'string' ? states[choices.player] : undefined;
    if (other && other !== state) other.tradeGoods += given;
  },
};
