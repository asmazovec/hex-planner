import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, quote } from '../kit';
import { id } from './it';

uiBench();

const table = (strategy: number) => {
  const mark = adjust({});
  return { mark, table: bench({ faction: 'xxcha', start: { technologies: [id] }, entries: [adjust({ strategy }), mark] }) };
};

// "You may exhaust this card and spend 1 token from your strategy pool when another player plays an action card"
// Checks: with the strategy pool empty I choose Instinct Training in «Used»; the warning that no strategy token is
// left appears and stands.
// Why the check is NOT redundant here: the token is the price, nothing pays it in its place.
test('technology:it chosen in «Used» with an empty strategy pool, the missing token stands', async () => {
  const xxcha = table(-2);
  quote(xxcha.table.pack, id, 'spend 1 token from your strategy pool');
  showUses(xxcha.table, xxcha.mark);
  await use('Instinct Training');
  expectShownStanding('shortStrategy');
});

// Checks: before it is chosen nothing is said of the pool.
test('technology:it not chosen, nothing is said of the strategy pool', () => {
  const xxcha = table(-2);
  showUses(xxcha.table, xxcha.mark);
  expectNotShown('shortStrategy');
});
