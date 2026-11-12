import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, quote, TARGET, tactical } from '../kit';
import { id } from './mo1';

uiBench();

// "You may place 1 infantry from your reinforcements on this planet."
// Checks: in «Used» of the landing that took Target One, the player names the card it explored with; the entry plays it.
// Why nothing is waived here: the card places a unit, which the replay adds when the entry names it.
test.fails('exploration:mo1 is chosen in «Used» of the landing that explored the planet', async () => {
  const move = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 1 } }, entries: [move] });
  quote(table.pack, id, 'You may place 1 infantry from your reinforcements on this planet.');
  const live = showUses(table, move);
  await use('Mercenary Outfit');
  expect(live.entry().uses).toEqual([id]);
});
