/**
 * The Galactic Council (Mecatol Rex, Thunder's Edge): "You may exhaust this card at the end of your turn and discard 1
 * secret objective to draw 1 secret objective."
 *
 * Decided: `play` that checks the card's condition. The swap itself is entered as the entry's `spends` and `gains`,
 * and the replay exhausts the card. The Galactic Council cannot be exhausted by a player with no unscored secret
 * objective in hand (Galactic Council note 1): the play warns of `componentCondition` then. It also checks LRR 53.3
 * with 53.2: the card lies in the play area of whoever controls Mecatol Rex.
 */
import { componentById } from '../../../components';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:mrte';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const { state, pack, warnings } = turn;
    const name = componentById(pack, id)?.name ?? id;
    if (state.control.mrte !== 'me') warnings.push(violation('componentNotHeld', { id, name }));
    // The plays run before the entry's gains and discards, so the hand is the one the player had.
    if (state.holdings.secrets.length === 0) {
      warnings.push(violation(componentCondition.code, { id, name, condition: 'no unscored secret objective in hand' }));
    }
  },
};
