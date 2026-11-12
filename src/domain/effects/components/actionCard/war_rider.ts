/**
 * Warfare Rider (action card, After an agenda is revealed): "You cannot vote on this agenda. Predict aloud an outcome
 * of this agenda. If your prediction is correct, place 1 dreadnought from your reinforcements in a system that
 * contains 1 or more of your ships."
 *
 * A `play` in the agenda phase (an entry of the component kind that is not a turn): the plan does not count votes, so
 * the player enters the system (`systemId`) when the prediction came true and a dreadnought is placed there. A system
 * without my ships is warned of.
 */
import type { ComponentEffect } from '../../types';
import { place, shipsIn, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:war_rider';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: turn => {
    if (turn.choices.systemId === undefined) return;
    const slot = String(turn.choices.systemId);
    if (shipsIn(turn, turn.state, slot) === 0) unmet(turn);
    place(turn, slot, { dreadnought: 1 });
  },
};
