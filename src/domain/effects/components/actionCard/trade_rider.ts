/**
 * Trade Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, gain 5 trade goods."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player marks a correct prediction (`correct: 1`) and gains 5 trade goods. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:trade_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
