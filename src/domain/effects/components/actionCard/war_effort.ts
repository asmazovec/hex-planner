/**
 * War Effort (action card, Action): "Place 1 cruiser from your reinforcements in a system that contains 1 or more of
 * your ships."
 *
 * A `play` of a component action with the choice `systemId`: a cruiser from my reinforcements is placed there. A
 * system without my ships is warned of; the fleet pool and the capacity still limit the ships there (`place`).
 */
import type { ComponentEffect } from '../../types';
import { place, shipsIn, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:war_effort';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: turn => {
    if (turn.choices.systemId === undefined) return;
    const slot = String(turn.choices.systemId);
    if (shipsIn(turn, turn.state, slot) === 0) unmet(turn);
    place(turn, slot, { cruiser: 1 });
  },
};
