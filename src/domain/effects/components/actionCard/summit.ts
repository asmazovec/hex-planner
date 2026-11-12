/**
 * Summit (action card, At the start of the strategy phase): "Gain 2 command tokens."
 *
 * A `play` at the start of the strategy phase (an entry of the component kind that is not a turn) with the choices
 * `tactic`, `fleet`, `strategy`: the tokens are gained into the pools chosen (LRR 20: a token gained may go to any
 * pool). More than two asked of the card is warned of, and still counted as entered.
 */
import type { ComponentEffect } from '../../types';
import { numberOf, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:summit';

const pool = (en: string, ru: string) => ({ ru, en });

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'tactic', kind: 'number', range: [0, 2], label: pool('Tactic pool', 'Тактический резерв') },
    { key: 'fleet', kind: 'number', range: [0, 2], label: pool('Fleet pool', 'Резерв флота') },
    { key: 'strategy', kind: 'number', range: [0, 2], label: pool('Strategy pool', 'Стратегический резерв') },
  ],
  play: turn => {
    const tactic = numberOf(turn, 'tactic');
    const fleet = numberOf(turn, 'fleet');
    const strategy = numberOf(turn, 'strategy');
    if (tactic + fleet + strategy > 2) unmet(turn);
    turn.state.tactic += tactic;
    turn.state.fleet += fleet;
    turn.state.strategy += strategy;
  },
};
