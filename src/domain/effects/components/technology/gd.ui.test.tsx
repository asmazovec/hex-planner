import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './gd';

uiBench();

/** The flight step of a route of 3 systems out of the home system, where a cruiser (move 2) stands. */
const flight = (technologies: string[]) => {
  const move = tactical(FAR, { moves: [{ from: HOME, units: {}, via: [NEAR, TARGET] }] });
  const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "After you activate a system, apply +1 to the move value of 1 of your ships during this tactical action."
// Checks: in the flight step I take the cruiser for a route one system longer than its move value; it is taken, and
// the speed warning of the route reads as allowed by Gravity Drive.
// Why the check is redundant here: the card gives this one ship the +1 the route needs.
test('technology:gd a ship is taken for a route one system too long, and the warning reads as allowed by Gravity Drive', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'apply +1 to the move value of 1 of your ships');
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('speedShort', 'Gravity Drive');
});

// LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
// Checks: without the card the same press takes the cruiser all the same, and the warning stands.
// Why the check is NOT redundant here: nothing this player holds changes the move value.
test('technology:gd not held, the ship is still taken and its speed warning stands', async () => {
  const { live } = flight([]);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('speedShort');
});
