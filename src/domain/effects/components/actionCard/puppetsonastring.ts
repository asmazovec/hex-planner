/**
 * Puppets on a String (action card, Thunder's Edge): "At the end of a player's turn, if you have passed: Perform 1
 * action."
 *
 * A waiver of `actionAfterPass` (LRR 3.3) for the one action that names the card in `uses` (or `spends`): a passed
 * player performs one more action. The rulings (tirules2 components/action-cards.md, Puppets On A String 6) keep the
 * player passed, so a later action without the card is warned of as before. Only the entry: no `lasts`.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:puppetsonastring';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  permit: [{ code: 'actionAfterPass', rule: 'Perform 1 action.' }],
};
