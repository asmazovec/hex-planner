/**
 * Counterstroke (action card, After another player activates a system that contains 1 of your command tokens):
 * "Return that command token to your tactic pool."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `systemId`:
 * my command token leaves that system for my tactic pool. A system without my token is warned of.
 */
import type { ComponentEffect } from '../../types';
import { unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:counterstroke';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: turn => {
    if (turn.choices.systemId === undefined) return;
    const slot = String(turn.choices.systemId);
    if (!turn.state.tokensOnMap.includes(slot)) return unmet(turn);
    turn.state.tokensOnMap.splice(turn.state.tokensOnMap.indexOf(slot), 1);
    turn.state.tactic += 1;
  },
};
