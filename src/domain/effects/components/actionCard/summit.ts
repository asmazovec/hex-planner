/**
 * Summit (action card, At the start of the strategy phase): "Gain 2 command tokens."
 *
 * A `play` at the start of the strategy phase (an entry of the component kind that is not a turn) with the choices
 * `tactic`, `fleet`, `strategy`: the tokens are gained into the pools chosen (LRR 20: a token gained may go to any
 * pool). More than two asked of the card is warned of, and still counted as entered.
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { numberChosen, unmetBy } from '../../helpers/cardPlay';

export const id = 'actionCard:summit';

const pool = (en: string, ru: string) => ({ ru, en });

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'tactic', kind: 'number', range: [0, 2], label: pool('Tactic pool', 'Тактический резерв') },
    { key: 'fleet', kind: 'number', range: [0, 2], label: pool('Fleet pool', 'Резерв флота') },
    { key: 'strategy', kind: 'number', range: [0, 2], label: pool('Strategy pool', 'Стратегический резерв') },
  ],
  holder: 'self',
  play: ctx => {
    const tactic = numberChosen(ctx, 'tactic');
    const fleet = numberChosen(ctx, 'fleet');
    const strategy = numberChosen(ctx, 'strategy');
    if (tactic + fleet + strategy > 2) unmetBy(ctx);
    return tactic || fleet || strategy ? [tokens(ctx.holder, { ...(tactic ? { tactic } : {}), ...(fleet ? { fleet } : {}), ...(strategy ? { strategy } : {}) })] : [];
  },
};
