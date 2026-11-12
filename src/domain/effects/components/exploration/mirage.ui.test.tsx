import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './mirage';

uiBench();

// "Place the Mirage planet token in this system. Gain the Mirage planet card and ready it."
// Checks: after a tactical action that explores a frontier token, I name the exploration card Mirage in «Used»; it is
// taken (and not the legendary card of the same planet).
// Why this is needed: the card gives control of a planet, which the plan counts, so the entry that explores must be
// able to name it; exploration cards are not offered in «Used» yet.
test.fails('exploration:mirage the card is named in «Used» of the action that explores', async () => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const mirage = bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });
  quote(mirage.pack, id, 'Gain the Mirage planet card and ready it.');
  const live = showUses(mirage, move);
  await use('Mirage');
  expect(live.entry().uses).toEqual([id]);
});
