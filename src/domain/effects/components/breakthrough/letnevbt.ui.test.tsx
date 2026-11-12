import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import type { StartHoldings } from '../../../types';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './letnevbt';

uiBench();

const table = (start: StartHoldings) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  return { move, table: bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { dreadnought: 1, cruiser: 1 } }, start, entries: [move] }) };
};

// "During movement, your non-fighter ships' move values are equal to the highest move value amongst moving ships in
//  the system they started in."
// Checks: in the flight step I take the dreadnought (move 1) for a system two away: the route warning shows; then I
// take the cruiser (move 2) into the same flight and the warning goes, as the dreadnought now moves 2.
// Why the default check does not apply: the breakthrough changes the move value the route is compared with.
test('breakthrough:letnevbt taking a fast ship into the flight removes the route warning of the slow one', async () => {
  const letnev = table({ breakthrough: 'held' });
  quote(letnev.table.pack, id, 'highest move value amongst moving ships in the system they started in');
  const live = showFlight(letnev.table, letnev.move, HOME);
  await take('Dreadnought');
  expectShownStanding('speedShort');
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ dreadnought: 1, cruiser: 1 });
  expectNotShown('speedShort');
});

// LRR 58.2: a ship moves no farther than its move value.
// Checks: without the breakthrough the cruiser taken into the flight does not help the dreadnought.
// Why the check is NOT redundant here: the breakthrough is not held.
test('breakthrough:letnevbt not held, the slow ship stays warned of with the fast one beside it', async () => {
  const letnev = table({});
  showFlight(letnev.table, letnev.move, HOME);
  await take('Dreadnought');
  await take('Cruiser');
  expectShownStanding('speedShort');
});
