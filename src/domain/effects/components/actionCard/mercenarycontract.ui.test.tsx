import { expect, test } from 'vitest';
import { choose, showTurn, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, quote } from '../kit';
import { id } from './mercenarycontract';

uiBench();

// "Spend 2 trade goods to place 2 neutral infantry on any non-home planet that contains no units"
// Checks: the editor of the component action that plays the card offers the planets where the infantry may go, and a
// press chooses Target One; the choice is written into the entry.
// Why the check is redundant here: nothing is lifted; the player must be able to say where the card places them.
test('actionCard:mercenarycontract the component action offers Target One for the neutral infantry', async () => {
  const entry = componentAction(id);
  const table = bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] }, entries: [adjust({ tradeGoods: 2 }), entry] });
  quote(table.pack, id, 'place 2 neutral infantry on any non-home planet');
  const live = showTurn(table, entry);
  await choose('Target One');
  expect(live.entry().choices).toEqual({ planet: 't1' });
});
