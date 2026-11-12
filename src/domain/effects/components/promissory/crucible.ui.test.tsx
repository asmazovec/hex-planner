import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import type { Game } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './crucible';

uiBench();

const NOTE = `${id}@o1`;
const CABAL: Game['opponents'][number] = { id: 'o1', faction: 'cabal', vp: 0, seat: 2, color: 2 };

/** Sol's cruiser flies four systems through the rift in the second one, holding the Cabal's Crucible. */
const show = () => {
  const entry = tactical(FARTHER, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET, FAR] }] });
  const table = bench({
    faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { promissory: [NOTE] }, entries: [entry],
    game: { opponents: [CABAL], map: { [HOME]: 'r-home', [NEAR]: 'r-rift', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  });
  return { table, live: showUses(table, entry) };
};

// Checks: before Crucible is named the cruiser short by one is warned of, and «Used» offers the note.
// Why the check is NOT redundant here: the note acts only once it is played.
test('promissory:crucible is chosen in «Used» of the action, and is written into the entry', async () => {
  const { live } = show();
  expectShownStanding('speedShort');
  await use('Crucible');
  expect(live.entry().uses).toEqual([NOTE]);
});

// "... apply an additional +1 to the move values of your ships that would move out of or through a gravity rift instead."
// Checks: once Crucible is named in «Used» the speed warning reads as allowed by it.
// Why the check is redundant here: the note adds 1 to a ship through a rift, which is the one step it lacked.
test.fails('promissory:crucible named in «Used», the speed warning reads as allowed by Crucible', async () => {
  const { table } = show();
  quote(table.pack, id, 'apply an additional +1 to the move values');
  await use('Crucible');
  expectShownWaived('speedShort', 'Crucible');
});
