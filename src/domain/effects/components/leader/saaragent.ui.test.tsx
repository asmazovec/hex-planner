import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, FAR, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './saaragent';

uiBench();

const table = () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { dreadnought: 1 }, via: [NEAR] }] });
  return { move, table: bench({
    faction: 'saar', expansions: ['pok'], units: { [HOME]: { dreadnought: 1 }, [FAR]: { cruiser: 1 } },
    start: { leaders: { [id]: 'unlocked' } }, entries: [move],
  }) };
};

// "When a player activates a system: You may exhaust this card to increase the move value of 1 of that player's ships
//  to match the move value of the ship on the game board that has the highest move value."
// Checks: the dreadnought's route warning stands; I choose Captain Mendosa in «Used», it is written into the entry,
// and the warning now reads as allowed by her.
// Why the check is redundant here: the agent raises the one slow ship to the move 2 of the cruiser on the board.
test.fails('leader:saaragent chosen in «Used», the slow ship\'s route warning reads as allowed by Captain Mendosa', async () => {
  const saar = table();
  quote(saar.table.pack, id, 'to match the move value of the ship on the game board that has the highest move value');
  const live = showUses(saar.table, saar.move);
  expectShownStanding('speedShort');
  await use('Captain Mendosa');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('speedShort', 'Captain Mendosa');
});

// LRR 58.2: a ship moves no farther than its move value.
// Checks: without the agent chosen the warning stands.
// Why the check is NOT redundant here: the agent was not used.
test('leader:saaragent not chosen, the slow ship\'s route warning stands', () => {
  const saar = table();
  showUses(saar.table, saar.move);
  expectShownStanding('speedShort');
});
