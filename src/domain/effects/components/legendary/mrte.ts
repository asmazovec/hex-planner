/**
 * The Galactic Council (Mecatol Rex, Thunder's Edge): "You may exhaust this card at the end of your turn and discard 1
 * secret objective to draw 1 secret objective."
 *
 * Decided: `play` that checks the card's condition. The swap itself is entered as the entry's `spends` and `gains`,
 * and the replay exhausts the card. The Galactic Council cannot be exhausted by a player with no unscored secret
 * objective in hand (Galactic Council note 1): the play warns of `componentCondition` then. It also checks LRR 53.3
 * with 53.2: the card lies in the play area of whoever controls Mecatol Rex.
 */
import type { Ability } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import { requireControlBy } from '../../helpers/cardPlay';

export const id = 'legendary:mrte';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const name = componentById(ctx.pack, id)?.name ?? id;
    requireControlBy(ctx, 'mrte');
    // The plays run before the entry's gains and discards, so the hand is the one the player had.
    if (!ctx.my.cards('secretObjective').some(held => held.state !== 'inPlay')) {
      ctx.warn(violation(componentCondition.code, { id, name, condition: 'no unscored secret objective in hand' }));
    }
    return [];
  },
};
