import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './ie';

uiBench();

/** The tactical editor of a carrier with two infantry arriving in the target, with two infantry to produce and no space dock. */
const editor = (technologies: string[]) => {
  const move = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], production: { infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 },
  });
  const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 2 } }, start: { technologies }, entries: [move], game: { planetControl: { h1: 'me' } } });
  return { table, live: showTactical(table, move) };
};

// "After you gain control of a planet, you may produce any number of units on that planet that have a combined cost
//  equal to or less than that planet's resource value."
// Checks: before the landing the production without a space dock stands; I land both infantry on Target One, and the
// same warning now reads as allowed by Integrated Economy.
// Why the check is redundant here: the landing gains control of a planet of 2 resources, and the card produces there
// units of a combined cost of 1 without a unit with PRODUCTION.
test('technology:ie landing on a planet turns the production without a space dock into one allowed by Integrated Economy', async () => {
  const { table, live } = editor([id]);
  quote(table.pack, id, 'you may produce any number of units on that planet');
  expectShownStanding('noProduction');
  await land('Infantry', 'Target One');
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 2 } }]);
  expectShownWaived('noProduction', 'Integrated Economy');
});

// LRR 67.3: a unit is produced through the Production abilities of the player's units.
// Checks: without the card, after the same landing the warning still stands.
// Why the check is NOT redundant here: nothing this player holds produces without a space dock.
test('technology:ie not held, the production after the landing still stands', async () => {
  const { live } = editor([]);
  await land('Infantry', 'Target One');
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 2 } }]);
  expectShownStanding('noProduction');
});
