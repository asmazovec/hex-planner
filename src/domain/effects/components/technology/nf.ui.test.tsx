import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, quote } from '../kit';
import { id } from './nf';

uiBench();

const table = (strategy: number) => {
  const mark = adjust({});
  return { mark, table: bench({ faction: 'xxcha', start: { technologies: [id] }, entries: [adjust({ strategy }), mark] }) };
};

// "... you may exhaust this card and spend 1 token from your strategy pool; immediately end that player's turn."
// Checks: with the strategy pool empty I choose Nullification Field in «Used»; the warning that no strategy token is
// left appears and stands.
// Why the check is NOT redundant here: the token is the price, nothing pays it in its place.
test.fails('technology:nf chosen in «Used» with an empty strategy pool, the missing token stands', async () => {
  const xxcha = table(-2);
  quote(xxcha.table.pack, id, 'spend 1 token from your strategy pool');
  showUses(xxcha.table, xxcha.mark);
  await use('Nullification Field');
  expectShownStanding('shortStrategy');
});

// Checks: before it is chosen nothing is said of the pool.
test('technology:nf not chosen, nothing is said of the strategy pool', () => {
  const xxcha = table(-2);
  showUses(xxcha.table, xxcha.mark);
  expectNotShown('shortStrategy');
});
