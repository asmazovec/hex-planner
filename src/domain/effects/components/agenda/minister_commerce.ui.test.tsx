import { expect, test } from 'vitest';
import { expectNotShown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, endOf, HOME, NEAR, primary, quote } from '../kit';
import { id } from './minister_commerce';

uiBench();

// "they gain 1 trade good for each player that is their neighbor"
// Checks: with the law in play Trade's primary raises the trade goods by one for the neighbour, and the entry shows no
// warning: the law only adds to the count.
// Why the check is redundant here: no check is lifted; the law changes a number the replay counts, so the screen's
// only duty is to stay quiet about it.
test('agenda:minister_commerce adds a trade good for the neighbour and warns of nothing', () => {
  const law: Entry = { ...adjust({}, 'strategy'), gains: [id] };
  const trade = primary(5);
  const table = bench({
    faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: [law, trade],
    game: { opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { x: { cruiser: 1 } } } },
  });
  quote(table.pack, id, 'they gain 1 trade good for each player that is their neighbor');
  showWarnings(table, trade);
  expectNotShown('shortTradeGoods');
  expect(endOf(table).tradeGoods).toBe(4);
});
