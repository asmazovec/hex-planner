import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './master_of_trade';

uiBench();

/** The warnings of Trade's secondary followed with an empty strategy pool. */
const follow = (faction: string) => {
  const entry = secondary(CARD.trade);
  const table = bench({ faction, entries: [adjust({ strategy: -2 }), entry] });
  showWarnings(table, entry);
  return table;
};

// "You do not have to spend a command token to resolve the secondary ability of the "Trade" strategy card."
// Checks: the Hacan follow Trade with no strategy token left and no warning about the token is shown.
// Why the check is redundant here: the secondary of Trade costs the Hacan no token (a `modify` of its cost).
test('ability:master_of_trade the secondary of Trade with an empty strategy pool shows no warning', () => {
  quote(follow('hacan').pack, id, 'You do not have to spend a command token');
  expectNotShown('shortStrategy');
});

// LRR 83.4: the secondary of a strategy card costs a token from the strategy pool.
// Checks: another faction is warned of the missing token.
// Why the check is NOT redundant here: the ability is printed on the Hacan sheet only.
test('ability:master_of_trade another faction following Trade with an empty pool is warned of', () => {
  follow('sol');
  expectShownStanding('shortStrategy');
});
