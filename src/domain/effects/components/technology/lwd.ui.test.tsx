import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './lwd';

uiBench();

/** The flight step of a cruiser out of the home system into the target, past another player's cruiser. */
const flight = (technologies: string[]) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [move],
    game: { enemyUnits: { [NEAR]: { rival: { cruiser: 1 } } } },
  });
  return { table, live: showFlight(table, move, HOME) };
};

// "Your ships can move through systems that contain other players' ships."
// Checks: in the flight step I take the cruiser for a route past another player's ships; it is taken, and the route
// warning reads as allowed by Light/Wave Deflector.
// Why the check is redundant here: LRR 58.3.2 forbids moving through such a system, and the card allows it.
test.fails('technology:lwd a ship is taken for a route past other players\' ships, and the warning reads as allowed by Light/Wave Deflector', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'Your ships can move through systems that contain other players\' ships.');
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('routeBlocked', 'Light/Wave Deflector');
});

// LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
// Checks: without the card the cruiser is still taken and the warning stands.
// Why the check is NOT redundant here: nothing this player holds lets ships pass.
test('technology:lwd not held, the ship is still taken and its route warning stands', async () => {
  const { live } = flight([]);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('routeBlocked');
});
