/**
 * Warfare Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, place 1 dreadnought from your reinforcements in a system that
 * contains 1 or more of your ships."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player enters the system (`systemId`) when the prediction came true and a dreadnought is placed there. Pass 1
 * keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:war_rider';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
