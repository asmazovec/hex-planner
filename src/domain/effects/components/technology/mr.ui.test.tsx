import { test } from 'vitest';
import { expectNotShown, expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, NO_PAYMENT, quote, TARGET, tactical } from '../kit';
import { id } from './mr';

uiBench();

const NOVA = { [HOME]: 'r-home', [NEAR]: 'r-supernova', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
/** The tactical editor of a cruiser's move into the supernova, producing `production` there. */
const editor = (technologies: string[], production: UnitCounts = {}) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }], production, payment: NO_PAYMENT });
  const table = bench({ faction: 'muaat', units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [move], game: { map: NOVA } });
  return { table, live: showTactical(table, move) };
};

// "Your ships can move into supernovas."
// Checks: the move into the supernova stands in the editor, and its warning reads as allowed by Magmus Reactor.
// Why the check is redundant here: LRR 86.1 forbids moving into a supernova; the card allows it.
test.fails('technology:mr the move into a supernova reads as allowed by Magmus Reactor', () => {
  const { table } = editor([id]);
  quote(table.pack, id, 'Your ships can move into supernovas.');
  expectShownWaived('routeBlocked', 'Magmus Reactor');
});

// "Each supernova that contains 1 or more of your units gains the PRODUCTION 5 ability as if it were 1 of your units."
// Checks: two fighters produced in the supernova show no warning that nothing produces there.
// Why the check is redundant here: the supernova is itself a unit with PRODUCTION 5 (67.1).
test.fails('technology:mr production in a supernova with my units shows no missing production', () => {
  editor([id], { fighter: 2 });
  expectNotShown('noProduction');
});

// LRR 86.1: "A ship cannot move through or into a supernova."
// Checks: without the technology both warnings stand.
// Why the check is NOT redundant here: the technology is not held.
test('technology:mr not held, the move into a supernova and its production stand', () => {
  editor([], { fighter: 2 });
  expectShownStanding('routeBlocked');
  expectShownStanding('noProduction');
});
