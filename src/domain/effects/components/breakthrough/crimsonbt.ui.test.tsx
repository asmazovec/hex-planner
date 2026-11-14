import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { Holdings } from '../../../../testing/old/domain/types';
import { bench, FAR, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './crimsonbt';

uiBench();

const move = () => tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
const table = (breakthrough?: Holdings['breakthrough']) => {
  const entry = move();
  return { entry, table: bench({ faction: 'crimson', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, start: breakthrough ? { breakthrough } : {}, entries: [entry] }) };
};

// "During your tactical actions, apply +1 to the move value of each of your ships that starts its movement in your
//  home system"
// Checks: a cruiser leaves the home system for a system three away; the tactical editor shows no speed warning, and
// the flight stays as entered.
// Why the default limit does not apply: the move value is 3 with the breakthrough, which reaches the active system.
test('breakthrough:crimsonbt a cruiser from home reaches a system three away without a speed warning', () => {
  const crimson = table('held');
  quote(crimson.table.pack, id, 'starts its movement in your home system');
  const live = showTactical(crimson.table, crimson.entry);
  expectNotShown('speedShort');
  expect(live.entry().moves[0].via).toEqual([NEAR, TARGET]);
});

// LRR 58.3 with the printed move of a cruiser, 2.
// Checks: without the breakthrough the same flight shows its speed warning standing.
// Why the check is NOT redundant here: nothing raises the move value.
test('breakthrough:crimsonbt not held, the speed warning of the same flight stands', () => {
  const crimson = table();
  showTactical(crimson.table, crimson.entry);
  expectShownStanding('speedShort');
});
