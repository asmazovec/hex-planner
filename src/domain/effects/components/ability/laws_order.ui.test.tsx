import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, NEAR, quote, tactical } from '../kit';
import { id } from './laws_order';

uiBench();

// "At the start of any player's turn: You may spend 1 trade good or 1 commodity to treat all laws as blank"
// Checks: the player names the ability in «Used» of a tactical action; it is recorded with the entry, and as it comes
// with the faction sheet no warning says it is not held.
// Why the check is redundant here: an ability is not a card to hold (`holds` passes it), so naming it breaks nothing.
test('ability:laws_order is named in Used of a turn and recorded with it', async () => {
  const turn = tactical(NEAR);
  const table = bench({ faction: 'keleresm', expansions: ['pok'], entries: [adjust({ tradeGoods: 2 }), turn] });
  quote(table.pack, id, 'treat all laws as blank until the end of that turn');
  const live = showUses(table, turn);
  await use('Law\'s Order');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});
