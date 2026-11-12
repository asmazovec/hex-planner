import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './voidborn';

uiBench();

const MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const table = (faction: string) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  return { move, table: bench({ faction, expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, entries: [move], game: { map: MAP } }) };
};

// "Nebulae do not affect your ships' movement"
// Checks: on a route through a nebula I take a cruiser into the flight; it is written into the move, and the warning
// that the route is blocked reads as allowed by Voidborn.
// Why the check is redundant here: LRR 59.1.1 forbids moving through a nebula, and nebulae do not affect the
// Empyrean ships' movement.
test.fails('ability:voidborn a cruiser is taken on a route through a nebula, and the warning reads as allowed by Voidborn', async () => {
  const empyrean = table('empyrean');
  quote(empyrean.table.pack, id, 'Nebulae do not affect your ships\' movement');
  const live = showFlight(empyrean.table, empyrean.move, HOME);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('routeBlocked', 'Voidborn');
});

// LRR 59.1.1: "A ship cannot move through a nebula."
// Checks: another faction takes the same cruiser, and its warning stands.
// Why the check is NOT redundant here: Voidborn is printed on the Empyrean sheet.
test('ability:voidborn another faction takes the cruiser too, and the warning stands', async () => {
  const sol = table('sol');
  const live = showFlight(sol.table, sol.move, HOME);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('routeBlocked');
});
