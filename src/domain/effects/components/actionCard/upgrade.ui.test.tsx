import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { UnitCounts } from '../../../types';
import { bench, endOf, quote, tactical, TARGET } from '../kit';
import { id } from './upgrade';

uiBench();

/** My ships stand in the target, which my tactical action activates; Upgrade is in my hand. */
const table = (there: UnitCounts) => {
  const move = tactical(TARGET);
  return { move, ...bench({ faction: 'sol', units: { [TARGET]: there }, start: { hand: [id] }, entries: [move] }) };
};

// "After you activate a system that contains 1 or more of your ships: Replace 1 of your cruisers in that system with 1
//  dreadnought from your reinforcements."
// Checks: in «Used» of my tactical action I choose Upgrade; the entry names it, and the board after the plan holds a
// dreadnought in place of one cruiser, with no missing unit shown.
// Why the check is redundant here: nothing is lifted; the dreadnought is placed, not produced.
test('actionCard:upgrade chosen in «Used» of the action replaces a cruiser with a dreadnought', async () => {
  const upgrade = table({ cruiser: 2 });
  quote(upgrade.pack, id, 'Replace 1 of your cruisers in that system with 1 dreadnought');
  const live = showUses(upgrade, upgrade.move);
  await use('Upgrade');
  expect(live.entry().uses).toEqual([id]);
  expect(endOf({ pack: upgrade.pack, game: live.game() }).systems[TARGET]).toEqual({ cruiser: 1, dreadnought: 1 });
  expectNotShown('unitsMissing');
});

// Note 2 of the card: "A player must have at least one cruiser in the active system to play and resolve Upgrade."
// Checks: chosen with only a destroyer in the target, the card is still taken, and the missing cruiser is shown as a
// warning that stands.
// Why the check is NOT redundant here: the card replaces a cruiser, and there is none.
test('actionCard:upgrade chosen without a cruiser shows the missing cruiser', async () => {
  const upgrade = table({ destroyer: 1 });
  const live = showUses(upgrade, upgrade.move);
  await use('Upgrade');
  expect(live.entry().uses).toEqual([id]);
  expectShownStanding('unitsMissing');
});
