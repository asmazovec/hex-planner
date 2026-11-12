import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './ah';

uiBench();

/** One infantry produced at home, on h2, where my PDS stands; there is no space dock. */
const production = (technologies: string[]) => {
  const move = tactical(HOME, { production: { infantry: 1 }, productionGround: { h2: { infantry: 1 } } });
  return { move, table: bench({ faction: 'argent', expansions: ['pok'], start: { technologies }, entries: [move], game: { pds: { h2: 1 } } }) };
};

// "Each planet that contains 1 or more of your structures gains the PRODUCTION 1 ability as if it were a unit."
// Checks: the tactical editor of a production at home, with only a PDS on h2, shows no warning that nothing produces
// there, nor that the infantry is placed off a producing unit.
// Why the check is redundant here: the planet with my structure is itself a unit with PRODUCTION 1.
test('technology:ah the production of a system with only my PDS is shown without a production warning', () => {
  const { move, table } = production([id]);
  quote(table.pack, id, 'gains the PRODUCTION 1 ability as if it were a unit');
  showTactical(table, move);
  expectNotShown('noProduction');
  expectNotShown('productionPlace');
});

// LRR 68.1: "This value is the maximum number of units that this unit can produce."
// Checks: without the technology the same production shows that nothing in the system produces.
// Why the check is NOT redundant here: a PDS has no Production of its own.
test('technology:ah without it the production of a system with only a PDS is warned of', () => {
  const { move, table } = production([]);
  showTactical(table, move);
  expectShownStanding('noProduction');
});
