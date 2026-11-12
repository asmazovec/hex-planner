import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showFlight, take, uiBench } from '../../../../ui/testing/effects';
import type { Entry, Opponent } from '../../../types';
import { bench, endOf, HOME, NEAR, quote, statusTokens, tactical } from '../kit';
import { id } from './malevolency';

uiBench();

const OBSIDIAN: Opponent = { id: 'o1', faction: 'obsidian', vp: 0, seat: 2, color: 2 };
const table = (notes: string[], rounds: Entry[][], cruisers = 0) => bench({
  faction: 'sol', expansions: ['pok', 'te'], units: { [HOME]: { cruiser: cruisers } }, start: { promissory: notes }, rounds,
  game: { opponents: [OBSIDIAN] },
});
/** The fleet pool after a status phase without the note: as many ships as one system may then hold. */
const ships = () => endOf(table([], [[statusTokens(1, 1, 0)]])).fleet;

// "At the end of the status phase, if you are not the Obsidian player, you must remove 1 command token from your fleet
//  pool".
// Checks: in the round after a status phase with the note held, I take into one system as many cruisers as the fleet
// pool would hold without it; every press takes a ship, and the fleet pool warning stands on the screen.
// Why the check is NOT redundant here: the note took a token from the fleet pool, so the last cruiser is beyond it.
test.fails('promissory:malevolency held, the ship the lost token would have allowed is warned of in the flight', async () => {
  const count = ships();
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const made = table([`${id}@o1`], [[statusTokens(1, 1, 0)], [move]], count);
  quote(made.pack, id, 'you must remove 1 command token from your fleet pool');
  const live = showFlight(made, move, HOME);
  for (let n = 0; n < count; n += 1) await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: count });
  expectShownStanding('fleetPool');
});

// LRR 37.1: the fleet pool is the maximum number of non-fighter ships in a system.
// Checks: without the note the same cruisers fit and no fleet pool warning is shown.
// Why the check is NOT redundant here: the fleet pool keeps its tokens without the note.
test('promissory:malevolency not held, the same ships fit the fleet pool', async () => {
  const count = ships();
  const move = tactical(NEAR, { moves: [{ from: HOME, units: {} }] });
  const live = showFlight(table([], [[statusTokens(1, 1, 0)], [move]], count), move, HOME);
  for (let n = 0; n < count; n += 1) await take('Cruiser');
  expect(live.entry().moves[0].units).toEqual({ cruiser: count });
  expectNotShown('fleetPool');
});
