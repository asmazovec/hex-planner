import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, endOf, HOME, quote, tactical } from '../kit';
import { id } from './titanscommander';

uiBench();

// "When 1 or more of your units use PRODUCTION: You may gain 1 trade good."
// Checks: in «Used» of a production I choose Tungstantus; it is written into the entry, and the unlocked commander
// raises no warning that it is not held.
// Why nothing is waived here: the commander adds a trade good; no rule forbids naming it.
test('leader:titanscommander is chosen in «Used» of a production and written into the entry', async () => {
  const entry = tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  const table = bench({ faction: 'titans', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [entry], game: { docks: ['h1'] } });
  quote(table.pack, id, 'You may gain 1 trade good');
  const live = showUses(table, entry);
  await use('Tungstantus');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
});

// Checks: the production that names Tungstantus ends with one trade good more.
// Why nothing is waived here: the gain is the commander's `play`.
test.fails('leader:titanscommander named in «Used», the production gains 1 trade good', async () => {
  const entry = tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
  const table = bench({ faction: 'titans', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [entry], game: { docks: ['h1'] } });
  const live = showUses(table, entry);
  await use('Tungstantus');
  expect(endOf({ pack: table.pack, game: live.game() }).tradeGoods).toBe(1);
});
