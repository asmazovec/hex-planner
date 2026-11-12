import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './armada';

uiBench();

// "The maximum number of non-fighter ships you can have in each system is equal to 2 more than the number of tokens in
//  your fleet pool"
// Checks: in the flight step the fleet line counts against five, not three; five cruisers make no warning, the sixth
// makes one that stands: Armada changes the number, it allows nothing beyond it.
// Why the default limit does not apply: the limit itself is two higher for the Letnev (a `modify`, not a waiver).
test('ability:armada the flight counts the ships against the fleet pool plus two, and warns only beyond it', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'letnev', units: { [HOME]: { cruiser: 6 } }, entries: [move] });
  quote(table.pack, id, 'is equal to 2 more than the number of tokens in your fleet pool');
  showFlight(table, move, HOME);
  for (let n = 0; n < 5; n += 1) await take('Cruiser');
  expect(screen.getByText('Fleet pool: 5 of 5')).toBeVisible();
  expectNotShown('fleetPool');
  await take('Cruiser');
  expectShownStanding('fleetPool');
});
