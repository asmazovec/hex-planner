/**
 * Black Market Dealings (action card, Thunder's Edge): "When you are negotiating a transaction: You and the other player
 * may include relics, action cards, and unscored secret objectives as part of the transaction. This card cannot be
 * canceled."
 *
 * A waiver of `transactionKind` (LRR 94.3) for the turn whose entry names the card in `uses`: a relic, an action card or
 * an unscored secret objective handed over in its transactions, by either side, is allowed. Anything else (a
 * technology, an agenda, a scored objective) still stands. Only the entry: no `lasts`. "Cannot be canceled" counts
 * nothing. A secret objective is scored when any player's holdings list it as scored.
 */
import { componentById } from '../../../components';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:blackmarketdealing';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  permit: [{
    code: 'transactionKind',
    rule: 'You and the other player may include relics, action cards, and unscored secret objectives as part of the transaction.',
    when: (warning, ctx) => {
      const kind = componentById(ctx.pack, String(warning.params.id))?.kind;
      if (kind === 'relic' || kind === 'actionCard') return true;
      if (kind !== 'secretObjective') return false;
      return !ctx.table.players.some(player => ctx.before.players[player.id]?.cards[String(warning.params.id)]?.state === 'inPlay');
    },
  }],
};
