/**
 * Trade Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, gain 5 trade goods."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player marks a correct prediction (`correct: 1`) and gains 5 trade goods.
 */
import type { ComponentEffect } from '../../types';
import { numberOf } from '../../helpers/cardPlay';

export const id = 'actionCard:trade_rider';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'correct', kind: 'number', range: [0, 1], label: { ru: 'Прогноз верен (1 да, 0 нет)', en: 'Prediction correct (1 yes, 0 no)' } }],
  play: turn => {
    if (numberOf(turn, 'correct') > 0) turn.state.tradeGoods += 5;
  },
};
