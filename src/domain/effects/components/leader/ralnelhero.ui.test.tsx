import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, showWarnings, uiBench, use } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../types';
import { bench, HOME, NEAR, planned, quote, tactical, using } from '../kit';
import { id } from './ralnelhero';

uiBench();

const pass = (): Entry => planned({ type: 'pass' } as EntryBody, 'action');
const table = (entries: Entry[]) =>
  bench({ faction: 'ralnel', expansions: ['pok', 'te'], units: { [HOME]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });

// "After the last player passes: You may choose to no longer be passed"
// Checks: in «Used» of my pass I choose Director Nel, and it is written into the pass.
// Why the check is redundant here: the hero is triggered by a pass, the Ral Nel's own among them (Director Nel note 1).
test('leader:ralnelhero is chosen in «Used» of the pass', async () => {
  const mine = pass();
  const ralnel = table([mine]);
  quote(ralnel.pack, id, 'You may choose to no longer be passed');
  const live = showUses(ralnel, mine);
  await use('Director Nel');
  expect(live.entry().uses).toEqual([id]);
});

// Checks: a tactical action after the pass that played the hero shows its turn-after-pass warning as allowed by
// Director Nel.
// Why the check is redundant here: LRR 3.3 ends the turns of a passed player; the hero unpasses them.
test.fails('leader:ralnelhero a turn after the pass reads as allowed by Director Nel', () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
  showWarnings(table([using(pass(), id), move]), move);
  expectShownWaived('actionAfterPass', 'Director Nel');
});

// LRR 3.3: "After a player has passed, they cannot perform any additional actions during that action phase."
// Checks: without the hero the same turn shows the warning standing.
// Why the check is NOT redundant here: the hero is not played.
test('leader:ralnelhero not played, the turn after the pass is warned of', () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
  showWarnings(table([pass(), move]), move);
  expectShownStanding('actionAfterPass');
});
