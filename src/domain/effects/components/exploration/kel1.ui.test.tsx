import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './kel1';

uiBench();

// "Gain 2 command tokens."
// Checks: in «Used» of the tactical action that explored the frontier token, the player finds the card and names it
// with the action; the entry then plays it.
// Why nothing is waived here: the card gives tokens, which the replay adds when the entry names it.
test('exploration:kel1 is chosen in «Used» of the action that explored it', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
  quote(table.pack, id, 'Gain 2 command tokens.');
  const live = showUses(table, move);
  await use('Keleres Ship');
  expect(live.entry().uses).toEqual([id]);
});
