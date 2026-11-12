import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NO_PAYMENT, quote, tactical } from '../kit';
import { id } from './hacanhero';

uiBench();

/** «Used» and the warnings of a production of two cruisers at home, paying nothing. */
const production = () => {
  const build = tactical(HOME, { production: { cruiser: 2 }, payment: NO_PAYMENT });
  const table = bench({ faction: 'hacan', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [build], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
  return { table, live: showUses(table, build) };
};

// "When 1 or more of your units use PRODUCTION: You may reduce the cost of each of your units to 0 during this use of
//  PRODUCTION."
// Checks: the unpaid production is warned of; I choose the hero in «Used», it is written into the entry, and the
// warning that resources are short goes.
// Why the check is redundant here: the units of this production cost 0, so nothing is owed (67.2).
test('leader:hacanhero chosen in Used, the production owes nothing', async () => {
  const { table, live } = production();
  quote(table.pack, id, 'reduce the cost of each of your units to 0');
  expectShownStanding('shortResources');
  await use('Harrugh Gefhara');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('shortResources');
});

// Checks: the hero is offered in «Used» and written into the entry, so the player can name it with a production.
test('leader:hacanhero can be chosen in Used for a production', async () => {
  const { live } = production();
  await use('Harrugh Gefhara');
  expect(live.entry().uses).toEqual([id]);
});
