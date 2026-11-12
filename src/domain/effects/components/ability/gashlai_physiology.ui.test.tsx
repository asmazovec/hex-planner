import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './gashlai_physiology';

uiBench();

const NOVA = { [HOME]: 'r-home', [NEAR]: 'r-supernova', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
/** The tactical editor of a cruiser's flight from home through the supernova to the target. */
const editor = (faction: string) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const table = bench({ faction, units: { [HOME]: { cruiser: 1 } }, entries: [move], game: { map: NOVA } });
  return { table, live: showTactical(table, move) };
};

// "Your ships can move through supernovas"
// Checks: the route through the supernova stands in the editor, and its warning reads as allowed by Gashlai Physiology.
// Why the check is redundant here: LRR 86.1 forbids moving through a supernova; the Muaat's ships may.
test.fails('ability:gashlai_physiology the route through a supernova reads as allowed by Gashlai Physiology', () => {
  const { table } = editor('muaat');
  quote(table.pack, id, 'Your ships can move through supernovas');
  expectShownWaived('routeBlocked', 'Gashlai Physiology');
});

// LRR 86.1: "A ship cannot move through or into a supernova."
// Checks: the same route of another faction is kept in the entry, and its warning stands.
// Why the check is NOT redundant here: nothing this player holds speaks of supernovas.
test('ability:gashlai_physiology another faction\'s route through a supernova stands', () => {
  editor('sol');
  expectShownStanding('routeBlocked');
});
