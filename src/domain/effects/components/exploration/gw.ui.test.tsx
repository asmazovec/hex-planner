import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './gw';

uiBench();

// "Place a gamma wormhole token in this system. Then, purge this card."
// Checks: in «Used» of the tactical action that explored the frontier token, the player names the card; the entry plays it.
// Why nothing is waived here: the card places a token, which the replay keeps for the rest of the game.
test('exploration:gw is chosen in «Used» of the action that explored it', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
  const table = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, entries: [move] });
  quote(table.pack, id, 'Place a gamma wormhole token in this system.');
  const live = showUses(table, move);
  await use('Gamma Wormhole');
  expect(live.entry().uses).toEqual([id]);
});
