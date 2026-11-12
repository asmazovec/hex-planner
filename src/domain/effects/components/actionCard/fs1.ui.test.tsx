import { expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, FAR, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './fs1';

uiBench();

/** A cruiser (move 2) flies three systems, with the card in hand. */
const move = () => tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
const table = (entry = move()) => ({ entry, ...bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, start: { hand: [id] }, entries: [entry] }) });

// "Apply +1 to the move value of each of your ships during this tactical action."
// Checks: the speed warning stands until Flank Speed is chosen in «Used»; then it is gone from the screen, and the
// card is in the entry's uses.
// Why the check is redundant here: with the card the cruiser's move value is 3, and three systems are reached.
test('actionCard:fs1 chosen in «Used», the cruiser reaches three systems away and the warning goes', async () => {
  const fast = table();
  quote(fast.pack, id, 'Apply +1 to the move value');
  const live = showUses(fast, fast.entry);
  expectShownStanding('speedShort');
  await use('Flank Speed');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('speedShort');
});

// LRR 58.3.6: a ship moves no farther than its move value.
// Checks: without the card the warning stands on the screen.
// Why the check is NOT redundant here: nothing raised the move value.
test('actionCard:fs1 not chosen, the speed warning stands', () => {
  const slow = table();
  showUses(slow, slow.entry);
  expectShownStanding('speedShort');
});
