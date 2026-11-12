import { expect, test } from 'vitest';
import { expectNotShown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, quote } from '../kit';
import { id } from './economic_equality';

uiBench();

const resolved = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });

// "For: Each player returns all of their trade goods to the supply. Then, each player gains 5 trade goods."
// Checks: the entry that resolves the directive shows its warnings and none of them is a payment or a hand limit one:
// the directive only sets the trade goods.
// Why the check is redundant here: there is no check; the directive changes a number, and the screen must stay quiet.
test('agenda:economic_equality an entry that resolves the directive shows no warning', () => {
  const entry = resolved();
  const table = bench({ faction: 'sol', entries: [adjust({ tradeGoods: 2 }), entry] });
  quote(table.pack, id, 'each player gains 5 trade goods');
  const live = showWarnings(table, entry);
  expect(live.warnings()).toEqual([]);
  expectNotShown('shortTradeGoods');
});
