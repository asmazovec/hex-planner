import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './se2';

uiBench();

const flight = (technologies: string[]) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction: 'titans', expansions: ['pok'], units: { [HOME]: { cruiser: 1, infantry: 3 } }, start: { technologies }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "Cost 2, Combat 6, Move 3, Capacity 2"
// Checks: in the flight step I take a cruiser and two infantry; no capacity warning; the third infantry makes one that
// stands.
// Why the default limit does not apply: the upgraded cruiser's capacity is 2 (a `modify`); it is still a limit.
test('technology:se2 a cruiser takes two infantry aboard, and the third is warned of', async () => {
  const { table, live } = flight([id]);
  quote(table.pack, id, 'Capacity 2');
  await take('Cruiser');
  await take('Infantry');
  await take('Infantry');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1, infantry: 2 });
  expectNotShown('capacityGroup');
  await take('Infantry');
  expectShownStanding('capacityGroup');
});

// Checks: without the upgrade the second infantry is already over capacity.
// Why the check is NOT redundant here: Saturn Engine I carries one.
test('technology:se2 without it the second infantry is over capacity', async () => {
  flight([]);
  await take('Cruiser');
  await take('Infantry');
  await take('Infantry');
  expectShownStanding('capacityGroup');
});
