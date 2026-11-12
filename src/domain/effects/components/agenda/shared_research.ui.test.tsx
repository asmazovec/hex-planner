import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './shared_research';

uiBench();

const NEBULA_MAP = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** The tactical editor of a cruiser's flight from home through the nebula to the target, with the law or without. */
const editor = (inPlay: boolean) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, entries: inPlay ? [law(), move] : [move], game: { map: NEBULA_MAP } });
  return { table, live: showTactical(table, move) };
};

// "For: Each player's units can move through nebulae."
// Checks: the route through the nebula stays in the entry, and its warning stands in the route block in the allowed
// look, naming Shared Research.
// Why the check is redundant here: the law lets every player's units move through nebulae, which 59.1 forbids.
test('agenda:shared_research a route through a nebula is kept, and the warning reads as allowed by Shared Research', () => {
  const { table, live } = editor(true);
  quote(table.pack, id, "Each player's units can move through nebulae.");
  expect(live.entry().moves[0].via).toEqual([NEAR]);
  expectShownWaived('routeBlocked', 'Shared Research');
});

// LRR 59.1: "A ship can move into a nebula only if that nebula is the active system."
// Checks: without the law the same route is kept too, since a warning forbids nothing, and its warning stands.
// Why the check is NOT redundant here: the law is not in play.
test('agenda:shared_research without the law the route through a nebula is kept and its warning stands', () => {
  const { live } = editor(false);
  expect(live.entry().moves[0].via).toEqual([NEAR]);
  expectShownStanding('routeBlocked');
});
