import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './mentakbt';

uiBench();

/** The flight step of a Mentak move through NEAR, where a rival destroyer stands, into the target held by `defended`. */
const flight = (defended: UnitCounts | null) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: {}, via: [NEAR] }] });
  const table = bench({
    faction: 'mentak', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, entries: [move],
    start: { technologies: ['technology:cr2'], breakthrough: 'held' },
    game: { opponents: [{ id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { o1: { destroyer: 1 } }, ...(defended ? { [TARGET]: { o1: defended } } : {}) } },
  });
  return { table, live: showFlight(table, move, HOME) };
};

// "If the active system contains another player's non-fighter ships, this unit can move through systems that contain
//  other players' ships."
// Checks: I take the Corsair for a route through the rival destroyer into the defended target; it is written into the
// move, and the warning of the blocked route reads as allowed by The Table's Grace.
// Why the check is redundant here: LRR 58.3.2 forbids moving through other players' ships, and the Corsair may while
// the active system holds another player's non-fighter ships.
test('breakthrough:mentakbt a Corsair is taken through enemy ships, and the warning reads as allowed by The Table\'s Grace', async () => {
  const { table, live } = flight({ cruiser: 1 });
  quote(table.pack, id, "this unit can move through systems that contain other players' ships");
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownWaived('routeBlocked', "The Table's Grace");
});

// LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
// Checks: into an undefended target the same press takes the ship and the warning stands.
// Why the check is NOT redundant here: the Corsair's condition does not hold.
test('breakthrough:mentakbt into an undefended system the ship is taken and the blocked route stands', async () => {
  const { live } = flight(null);
  await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: 1 });
  expectShownStanding('routeBlocked');
});
