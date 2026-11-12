/**
 * Political Censure (law): "The elected player gains this card and 1 victory point. The elected player cannot play
 * action cards. If the owner of this card loses this card, they lose 1 victory point."
 *
 * Decided: mixed (play and a new check). The elected player gains 1 victory point, and loses it with the card; the
 * elected player cannot play action cards, a check the replay does not make yet (a new code). Pass 1 keeps it a hint;
 * the tests mark what it must do.
 */
import actionCardBarred from '../../../rules/codes/actionCardBarred';
import { violation } from '../../../rules/registry';
import { componentById } from '../../../components';
import { actionCardsPlayed } from '../../points/status';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:censure';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  gained: turn => { turn.state.vp += 1; },
  lost: turn => { turn.state.vp -= 1; },
  restrict: turn => {
    for (const card of actionCardsPlayed(turn.entry, turn.pack)) {
      turn.warnings.push(violation(actionCardBarred.code, { id: card, name: componentById(turn.pack, card)?.name ?? card }));
    }
  },
};
