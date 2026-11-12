import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './majent';

uiBench();

// "Gain 1 command token and 3 trade goods."
// Checks: in «Used» of the tactical action that explored the frontier token, the player finds the card and names it
// with the action; the entry then plays it.
// Why nothing is waived here: the card gives a token and goods, which the replay adds when the entry names it.
test('exploration:majent is chosen in «Used» of the action that explored it', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
  quote(table.pack, id, 'Gain 1 command token and 3 trade goods.');
  const live = showUses(table, move);
  await use('Major Entropic Field');
  expect(live.entry().uses).toEqual([id]);
});
