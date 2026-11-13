import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench } from '../../../../ui/testing/effects';
import { bench, NEAR, quote, tactical, using } from '../kit';
import { id } from './favor';

uiBench();

const NOTE = `${id}@a`;

// "When an agenda is revealed: Remove 1 token from the Xxcha player's strategy pool and return it to their reinforcements."
// Checks: «Used» of my turn names the Xxcha player's Political Favor that I hold: the editor shows no warning, and the
// entry keeps the note; the token it takes is the Xxcha player's, so nothing is asked of me.
// Why no check stands: the card asks nothing of the player; its count is made by the replay.
test('promissory:favor named in «Used» shows no warning and asks nothing', () => {
  const entry = using(tactical(NEAR), NOTE);
  const table = bench({
    faction: 'sol', expansions: ['pok'], entries: [entry],
    game: { opponents: [{ id: 'a', faction: 'xxcha', vp: 0, seat: 2, color: 2 }], start: { me: { promissory: [NOTE] }, opponents: { a: {} } } },
  });
  quote(table.pack, id, 'Remove 1 token from the Xxcha player\'s strategy pool');
  const live = showUses(table, entry);
  expect(live.entry().uses).toEqual([NOTE]);
  expectNotShown('componentNotHeld');
});
