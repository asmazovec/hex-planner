import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './sdn2';

uiBench();

/** The flight step of a move from home to the target two systems away, with a super dreadnought at home. */
const flight = (technologies: string[]) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({ faction: 'l1z1x', units: { [HOME]: { dreadnought: 1 } }, start: { technologies }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "Cost 4, Combat 4, Move 2, Capacity 2"
// Checks: in the flight step I take the super dreadnought for a route of two systems; it is written into the move and
// no warning of its move value is shown.
// Why the check is redundant here: the upgrade's Move 2 covers the route; the number changed, nothing is waived.
test('technology:sdn2 a super dreadnought is taken for two systems, and no warning of its move value is shown', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'Move 2');
  await take('Dreadnought');
  expect(live.entry().moves[0].units).toEqual({ dreadnought: 1 });
  expectNotShown('speedShort');
});

// LRR 58.3.6: "the number of systems the ship enters cannot exceed its move value."
// Checks: without the upgrade the same press takes the ship and the warning stands.
// Why the check is NOT redundant here: Super Dreadnought I moves 1.
test('technology:sdn2 without the upgrade the ship is taken all the same and its warning stands', async () => {
  const { live } = flight([]);
  await take('Dreadnought');
  expect(live.entry().moves[0].units).toEqual({ dreadnought: 1 });
  expectShownStanding('speedShort');
});
