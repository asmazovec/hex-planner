import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, expectShownWaived, showFlight, take, takeButton, uiBench } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './argent_mech';

uiBench();

/** The flight step of a move out of the home system, where `units` stand, with nothing chosen yet. */
const flight = (faction: string, units: UnitCounts) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const table = bench({ faction, expansions: ['pok'], units: { [HOME]: units }, entries: [move] });
  return { table, live: showFlight(table, move, HOME) };
};

// "This unit does not count against capacity if it is being transported or if it is in a space area with 1 or more of
//  your ships that have capacity values."
// Checks: in the flight step I take a destroyer, an infantry and then a mech beyond the one place on board; the button
// of the mech takes it, and the capacity warning stands in the cargo block as allowed, naming Aerie Sentinel.
// Why the check is redundant here: the mech is not counted against capacity, so the load is the infantry alone.
test('mech:argent_mech a mech is taken aboard a destroyer beyond its capacity, and the warning reads as allowed by Aerie Sentinel', async () => {
  const { table, live } = flight('argent', { destroyer: 1, infantry: 1, mech: 1 });
  quote(table.pack, id, 'This unit does not count against capacity if it is being transported');
  await take('Destroyer');
  await take('Infantry');
  expectNotShown('capacityGroup');
  expect(takeButton('Mech')).toBeEnabled();
  await take('Mech');
  expect(live.entry().moves[0].units).toEqual({ destroyer: 1, infantry: 1, mech: 1 });
  expectShownWaived('capacityGroup', 'Aerie Sentinel');
  expectShownWaived('capacitySystem', 'Aerie Sentinel');
});

// LRR 16.1: "A unit's capacity value indicates the maximum combined number of fighters and ground forces that it can transport."
// Checks: the same presses for another faction leave the warning standing, in the look of every warning.
// Why the check is NOT redundant here: the ability is printed on the Argent mech alone.
test('mech:argent_mech another faction takes the mech aboard all the same, and its warning stands', async () => {
  const { live } = flight('letnev', { destroyer: 1, mech: 1 });
  await take('Destroyer');
  await take('Mech');
  expect(live.entry().moves[0].units).toEqual({ destroyer: 1, mech: 1 });
  expectShownStanding('capacityGroup');
});
