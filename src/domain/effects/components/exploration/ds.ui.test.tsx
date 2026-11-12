import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, quote, TARGET, tactical } from '../kit';
import { id } from './ds';

uiBench();

// "This planet's resource value is increased by 2 and its influence value is increased by 1."
// Checks: in «Used» of the landing that took Target One, the player names the card it explored with; the entry plays it
// and attaches it.
// Why nothing is waived here: the card changes the planet's values, which the count then asks.
test.fails('exploration:ds is chosen in «Used» of the landing that explored the planet', async () => {
  const move = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [TARGET]: { carrier: 1, infantry: 1 } }, entries: [move] });
  quote(table.pack, id, 'its influence value is increased by 1');
  const live = showUses(table, move);
  await use('Dyson Sphere');
  expect(live.entry().uses).toEqual([id]);
});
