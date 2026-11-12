import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './cabalcommander';

uiBench();

/** The tactical editor of a production at home, where the dock on h1 has a Production of 5. */
const show = (units: UnitCounts) => {
  const entry = tactical(HOME, { production: units });
  const table = bench({ faction: 'cabal', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [entry], game: { docks: ['h1'] } });
  showTactical(table, entry);
  return table;
};

// "When you produce fighter or infantry units: Up to 2 of those units do not count against your PRODUCTION limit."
// Checks: seven infantry are bought at a dock of Production 5; the production block shows the warning in the allowed
// look, naming the commander.
// Why the check is redundant here: two of the infantry are not counted (67.2 counts the rest, five).
test('leader:cabalcommander seven infantry at a dock of 5: the production warning reads as allowed by That Which Molds Flesh', () => {
  const table = show({ infantry: 7 });
  quote(table.pack, id, 'Up to 2 of those units do not count against your PRODUCTION limit');
  expectShownWaived('productionOver', 'That Which Molds Flesh');
});

// Checks: eight infantry leave the warning standing.
// Why the check is NOT redundant here: "up to 2"; six are over five.
test('leader:cabalcommander eight infantry at a dock of 5: the warning stands', () => {
  show({ infantry: 8 });
  expectShownStanding('productionOver');
});
