import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectShownStanding, showTurn, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, componentAction, endOf, quote } from '../kit';
import { id } from './bribery';

uiBench();

const more = () => userEvent.click(screen.getByRole('button', { name: 'Add one Trade goods spent' }));

// "Spend any number of trade goods. For each trade good spent, cast 1 additional vote for the outcome on which you
//  voted."
// Checks: Bribery played in the editor of a component action, I raise the trade goods it spends to two; the entry
// keeps them and the plan ends with the one left of three.
// Why the default does not apply: a component action spends nothing by itself; the card names how many trade goods.
test('actionCard:bribery two trade goods set in the editor are spent', async () => {
  const entry = componentAction(id, { phase: 'agenda' });
  const table = bench({ faction: 'hacan', start: { hand: [id] }, entries: [adjust({ tradeGoods: 3 }), entry] });
  quote(table.pack, id, 'Spend any number of trade goods.');
  const live = showTurn(table, entry);
  await more();
  await more();
  expect(live.entry().choices).toEqual({ tradeGoods: 2 });
  expect(endOf({ pack: table.pack, game: live.game() }).tradeGoods).toBe(1);
});

// Checks: two trade goods asked with only one held is a shortfall on the screen.
// Why the check is NOT redundant here: the card spends what the player holds; it gives nothing.
test('actionCard:bribery more trade goods than held is shown as a shortfall', async () => {
  const entry = componentAction(id, { phase: 'agenda' });
  const table = bench({ faction: 'hacan', start: { hand: [id] }, entries: [adjust({ tradeGoods: 1 }), entry] });
  showTurn(table, entry);
  await more();
  await more();
  expectShownStanding('shortTradeGoods');
});
