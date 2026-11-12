import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './muaathero';

uiBench();

// "After you move a war sun into a non-home system other than Mecatol Rex: You may destroy all other players' units in that system ..."
// Checks: the hero is offered in «Used» of the tactical action that moved the war sun and is written into the entry.
// Why nothing is lifted: the hero changes no check; it destroys units, which the replay does by playing it.
test('leader:muaathero can be chosen in Used of the tactical action that moved a war sun', async () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { warsun: 1 }, via: [NEAR] }] });
  const table = bench({ faction: 'muaat', expansions: ['pok'], units: { [HOME]: { warsun: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });
  quote(table.pack, id, 'After you move a war sun into a non-home system other than Mecatol Rex');
  const live = showUses(table, move);
  await use("Adjudicator Ba'al");
  expect(live.entry().uses).toEqual([id]);
});
