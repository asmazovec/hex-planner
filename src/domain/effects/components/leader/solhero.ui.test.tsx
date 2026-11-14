import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './solhero';

uiBench();

const table = (between: Entry[], again: Entry) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } },
  entries: [tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), ...between, again],
});

// "ACTION: Remove each of your command tokens from the game board and return them to your reinforcements."
// Checks: after the hero, the editor of a second tactical action in the system activated before shows no warning
// about the token already there.
// Why the check is redundant here: the hero took the token off the board, so the system can be activated (5.2).
test('leader:solhero a system activated before the hero is activated again with no warning', () => {
  const again = tactical(NEAR);
  const sol = table([componentAction(id)], again);
  quote(sol.pack, id, 'Remove each of your command tokens from the game board');
  showTactical(sol, again);
  expectNotShown('systemHasToken');
});

// LRR 5.2.
// Checks: without the hero the same editor shows the warning standing.
// Why the check is NOT redundant here: the token is still on the board.
test('leader:solhero not played, the second activation shows the warning standing', () => {
  const again = tactical(NEAR);
  showTactical(table([], again), again);
  expectShownStanding('systemHasToken');
});
