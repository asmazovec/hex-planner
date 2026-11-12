import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './hcf2';

uiBench();

/** The flight step out of the home system, where a cruiser and four fighters stand, with nothing chosen yet. */
const flight = (faction: string, technology: string) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction, units: { [HOME]: { cruiser: 1, fighter: 4 } }, start: { technologies: [technology] }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};
const takeAll = async () => {
  await take('Cruiser');
  for (let n = 0; n < 4; n += 1) await take('Fighter');
};

// "Fighters in excess of your ships' capacity count as 1/2 of a ship against your fleet pool."
// Checks: in the flight step I take a cruiser and four fighters; every press takes a unit, and the four excess fighters
// weigh two ships, so with the cruiser three stand against the fleet pool of 3 and no warning is shown.
// Why the default count does not apply: the card halves what the excess fighters weigh against the fleet pool.
test('technology:hcf2 a cruiser and four fighters fly within the fleet pool: no warning is shown', async () => {
  const { table, live } = flight('naalu', id);
  quote(table.pack, id, 'count as 1/2 of a ship against your fleet pool');
  await takeAll();
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1, fighter: 4 });
  expectNotShown('capacityGroup');
  expectNotShown('fleetPool');
});

// Fighter II: "Fighters in excess of your ships' capacity count against your fleet pool."
// Checks: another faction with the common Fighter II takes the same units, and the fleet pool warning stands.
// Why the check is NOT redundant here: each excess fighter of Fighter II is a whole ship.
test('technology:hcf2 another faction with Fighter II takes the same units, and the fleet pool warning stands', async () => {
  const { live } = flight('sol', 'technology:ff2');
  await takeAll();
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1, fighter: 4 });
  expectShownStanding('fleetPool');
});
