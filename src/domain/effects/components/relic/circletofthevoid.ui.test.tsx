import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './circletofthevoid';

uiBench();

/** The route from home to the target runs through an asteroid field in NEAR; nothing is taken yet. */
const flight = (relics: string[]) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({
    faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { relics }, entries: [move],
    game: { map: { [HOME]: 'r-home', [NEAR]: 'r-asteroid', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  });
  return { table, live: showFlight(table, move, HOME) };
};

// "you ignore the effects of all other anomalies on movement."
// Checks: in the flight step I take the cruiser for a route through an asteroid field; it is taken, and the route
// warning reads as allowed by Circlet of the Void.
// Why the check is redundant here: LRR 11.1 forbids moving through an asteroid field; the holder of the Circlet
// ignores that effect of an anomaly (Circlet note 1).
test('relic:circletofthevoid a cruiser flies through an asteroid field, and the warning reads as allowed by Circlet of the Void', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'you ignore the effects of all other anomalies on movement');
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('routeBlocked', 'Circlet of the Void');
});

// LRR 11.1: "A ship cannot move through or into an asteroid field."
// Checks: without the relic the cruiser is taken all the same and the warning stands.
// Why the check is NOT redundant here: no component of this player speaks of anomalies.
test('relic:circletofthevoid not held, the cruiser is taken and the asteroid field warning stands', async () => {
  const { live } = flight([]);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('routeBlocked');
});
