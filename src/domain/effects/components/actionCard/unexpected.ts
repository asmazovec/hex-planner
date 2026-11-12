/**
 * Unexpected Action (action card, Action): "Remove 1 of your command tokens from the game board and return it to your
 * reinforcements."
 *
 * A `play` of a component action with the choice `systemId`: my command token leaves that system for my reinforcements
 * (not for a pool). A system without my token is warned of.
 */
import type { ComponentEffect } from '../../types';
import { unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:unexpected';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: turn => {
    if (turn.choices.systemId === undefined) return;
    const slot = String(turn.choices.systemId);
    if (!turn.state.tokensOnMap.includes(slot)) return unmet(turn);
    turn.state.tokensOnMap.splice(turn.state.tokensOnMap.indexOf(slot), 1);
  },
};
