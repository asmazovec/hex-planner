import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './amd';

uiBench();

/** The flight step of a cruiser out of the home system through an asteroid field into the target. */
const flight = (technologies: string[]) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({
    faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [move],
    game: { map: { [HOME]: 'r-home', [NEAR]: 'r-asteroid', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  });
  return { table, live: showFlight(table, move, HOME) };
};

// "Your ships can move into and through asteroid fields."
// Checks: in the flight step I take the cruiser for a route through an asteroid field; it is taken, and the route
// warning reads as allowed by Antimass Deflectors.
// Why the check is redundant here: LRR 11.1 closes asteroid fields, and the card opens them to this player's ships.
test.fails('technology:amd a ship is taken for a route through an asteroid field, and the warning reads as allowed by Antimass Deflectors', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'Your ships can move into and through asteroid fields.');
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('routeBlocked', 'Antimass Deflectors');
});

// LRR 11.1: "A ship cannot move through or into an asteroid field."
// Checks: without the card the cruiser is still taken and the warning stands.
// Why the check is NOT redundant here: nothing this player holds opens asteroid fields.
test('technology:amd not held, the ship is still taken and its route warning stands', async () => {
  const { live } = flight([]);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('routeBlocked');
});
