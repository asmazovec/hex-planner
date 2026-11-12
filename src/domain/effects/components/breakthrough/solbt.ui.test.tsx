import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { StartHoldings, UnitCounts } from '../../../types';
import { bench, HOME, quote, tactical } from '../kit';
import { id } from './solbt';

uiBench();

const show = (production: UnitCounts, start: StartHoldings = { breakthrough: 'held' }) => {
  const entry = tactical(HOME, { production });
  const table = bench({ faction: 'sol', expansions: ['te'], start, entries: [entry], game: { docks: ['h1'] } });
  showTactical(table, entry);
  return table;
};

// "When you produce a ship that has capacity, you may also produce any combination of ground forces or fighters up to
//  that ship's capacity; they do not count against your PRODUCTION limit."
// Checks: a carrier and six infantry built at the home dock (PRODUCTION 5): the warning of the production limit is
// on the screen in the allowed look, naming Bellum Gloriosum.
// Why the check is redundant here: the six infantry carried are not counted; one unit is left against five.
test('breakthrough:solbt the carrier and its infantry beyond PRODUCTION read as allowed by Bellum Gloriosum', () => {
  const table = show({ carrier: 1, infantry: 6 });
  quote(table.pack, id, 'they do not count against your PRODUCTION limit');
  expectShownWaived('productionOver', 'Bellum Gloriosum');
});

// Checks: units beyond the capacity of the carrier still show the warning standing.
// Why the check is NOT redundant here: five cruisers and a carrier are six units against five.
test('breakthrough:solbt what is beyond the capacity shows the warning standing', () => {
  show({ carrier: 1, infantry: 6, cruiser: 5 });
  expectShownStanding('productionOver');
});

// LRR 68.1.
// Checks: without the breakthrough the carrier and six infantry show the warning standing.
test('breakthrough:solbt not held, the warning stands', () => {
  show({ carrier: 1, infantry: 6 }, {});
  expectShownStanding('productionOver');
});
