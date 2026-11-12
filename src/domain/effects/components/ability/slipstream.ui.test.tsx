import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './slipstream';

uiBench();

/** The flight of a source in the home system to TARGET, two systems on, with nothing chosen yet. */
const flight = (faction: string) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({ faction, units: { [HOME]: { carrier: 1 } }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "Apply +1 to the move value of each of your ships that starts its movement in your home system"
// Checks: in the flight step I take the carrier (move 1) for a route of two systems out of the home system; no
// warning about its speed is on the screen.
// Why the default limit does not apply: the carrier's move value is 2 by the ability (a modify, nothing waived).
test('ability:slipstream a carrier out of the home system flies two systems with no speed warning', async () => {
  const { table, live } = flight('ghost');
  quote(table.pack, id, 'starts its movement in your home system');
  await take('Carrier');
  expect(live.entry().moves[0].units).toEqual({ carrier: 1 });
  expectNotShown('speedShort');
});

// LRR 58.3.6.
// Checks: the same flight of another faction shows the warning standing.
// Why the check is NOT redundant here: the ability is the Creuss player's own.
test('ability:slipstream another faction\'s carrier shows the speed warning standing', async () => {
  flight('letnev');
  await take('Carrier');
  expectShownStanding('speedShort');
});
