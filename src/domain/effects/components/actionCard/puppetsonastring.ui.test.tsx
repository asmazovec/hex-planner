import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, use, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, HOME, NEAR, planned, quote, tactical } from '../kit';
import { id } from './puppetsonastring';

uiBench();

const table = (late: Entry) => bench({
  faction: 'sol', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, start: { hand: [id] },
  entries: [planned({ type: 'pass' } as EntryBody), late],
});
const late = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });

// "At the end of a player's turn, if you have passed: Perform 1 action."
// Checks: an action entered after my pass is warned of; I name the card in «Used», it is written into the entry, and
// the warning reads as allowed by Puppets on a String.
// Why the check is redundant here: LRR 3.3 ends a passed player's actions; the card grants one more.
test('actionCard:puppetsonastring named in «Used» of an action after the pass, the warning reads as allowed by Puppets on a String', async () => {
  const action = late();
  const puppets = table(action);
  quote(puppets.pack, id, 'Perform 1 action.');
  const live = showUses(puppets, action);
  expectShownStanding('actionAfterPass');
  await use('Puppets on a String');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('actionAfterPass', 'Puppets on a String');
});

// LRR 3.3: "After a player has passed, they cannot perform any additional actions during that action phase."
// Checks: without the card the action stays in the plan and its warning stands.
// Why the check is NOT redundant here: nothing played lets the passed player act.
test('actionCard:puppetsonastring not named, the action after the pass stands warned', () => {
  const action = late();
  showUses(table(action), action);
  expectShownStanding('actionAfterPass');
});
