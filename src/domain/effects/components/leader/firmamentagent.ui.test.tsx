import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, UnitCounts } from '../../../types';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './firmamentagent';

uiBench();

/** My ships fly from home to the target through the system next to it, where a rival destroyer stands. */
const flight = (units: UnitCounts): Entry => tactical(TARGET, { moves: [{ from: HOME, units, via: [NEAR] }] });
const table = (move: Entry, units: UnitCounts) => bench({
  faction: 'firmament', expansions: ['pok', 'te'], units: { [HOME]: units }, start: { leaders: { [id]: 'unlocked' } }, entries: [move],
  game: { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } },
});

// LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
// Checks: the agent is chosen in «Used» of the tactical action and stays there; before it is chosen the route
// through the rival destroyer is warned of.
// Why the check is NOT redundant here: until the agent is exhausted for the move, the rule stands.
test('leader:firmamentagent is chosen in «Used» of the tactical action', async () => {
  const move = flight({ cruiser: 1 });
  const live = showUses(table(move, { cruiser: 1 }), move);
  expectShownStanding('routeBlocked');
  await use('Myru Vos');
  expect(live.entry().uses).toEqual([id]);
});

// "If they are not transporting units, they can also move through other players' ships."
// Checks: with the agent chosen in «Used», the route warning stays on the screen in the allowed look and names
// Myru Vos.
// Why the check is redundant here: the exhausted agent lets ships that transport nothing pass other players' ships.
test.fails('leader:firmamentagent chosen in «Used», the route through other players\' ships reads as allowed by Myru Vos', async () => {
  const move = flight({ cruiser: 1 });
  const made = table(move, { cruiser: 1 });
  quote(made.pack, id, 'they can also move through other players\' ships');
  showUses(made, move);
  await use('Myru Vos');
  expectShownWaived('routeBlocked', 'Myru Vos');
});

// "If they are not transporting units".
// Checks: a carrier with an infantry on board, agent chosen: the route warning still stands on the screen.
// Why the check is NOT redundant here: ships that transport units are not covered by the card.
test('leader:firmamentagent chosen for a carrier with ground forces on board, the route warning stands', async () => {
  const move = flight({ carrier: 1, infantry: 1 });
  const live = showUses(table(move, { carrier: 1, infantry: 1 }), move);
  await use('Myru Vos');
  expect(live.entry().uses).toEqual([id]);
  expectShownStanding('routeBlocked');
});
