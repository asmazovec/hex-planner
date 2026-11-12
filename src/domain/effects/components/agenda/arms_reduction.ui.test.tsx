import { expect, test } from 'vitest';
import { expectNotShown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, HOME, quote } from '../kit';
import { id } from './arms_reduction';

uiBench();

const resolved = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });

// "For: Each player destroys all but 2 of their dreadnoughts and all but 4 of their cruisers."
// Checks: the entry that resolves the directive over a fleet beyond the numbers shows no warning: the units are
// destroyed by the directive, not missing from a flight.
// Why the check is redundant here: there is no check; the directive removes units and the screen must stay quiet.
test('agenda:arms_reduction an entry that resolves the directive shows no warning', () => {
  const entry = resolved();
  const table = bench({ faction: 'sol', units: { [HOME]: { dreadnought: 3, cruiser: 6 } }, entries: [entry] });
  quote(table.pack, id, 'all but 2 of their dreadnoughts');
  const live = showWarnings(table, entry);
  expect(live.warnings()).toEqual([]);
  expectNotShown('unitsMissing');
});
