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
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { violation } from '../../../rules/registry';
import { spendStrategyBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'technology:qdn';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const events = spendStrategyBy(ctx);
    const have = ctx.my.tradeGoods;
    if (3 > have) ctx.warn(violation('shortTradeGoods', { needed: 3, have }, 'component'));
    const given = Math.min(3, have);
    if (given > 0) events.push(tradeGoods(ctx.holder, -given));
    const other = typeof ctx.choices.player === 'string' ? ctx.playerOf(ctx.choices.player) : undefined;
    if (other !== undefined && other !== ctx.holder && given > 0) events.push(tradeGoods(other, given));
    return events;
  },
};
