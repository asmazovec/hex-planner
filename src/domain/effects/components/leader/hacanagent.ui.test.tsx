import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './hacanagent';

uiBench();

// "During the action phase: You may exhaust this card to gain 2 commodities ..."
// Checks: the agent is offered in «Used» of a tactical action and written into the entry, which is what plays it.
// Why nothing is lifted: the agent changes no check, it gains commodities (counted by the replay once it is a play).
test('leader:hacanagent can be chosen in Used of a tactical action', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const table = bench({ faction: 'hacan', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });
  quote(table.pack, id, 'exhaust this card to gain 2 commodities');
  const live = showUses(table, move);
  await use('Carth of Golden Sands');
  expect(live.entry().uses).toEqual([id]);
});
