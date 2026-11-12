import { expect, test } from 'vitest';
import { choose, showUses, uiBench } from '../../../../ui/testing/effects';
import { bench, endOf, HOME, quote, tactical, using } from '../kit';
import { id } from './yso';

uiBench();

// "After you produce units, place up to 2 infantry from your reinforcements on any planet you control ..."
// Checks: a tactical action that produces and names Yin Spinner Omega in «Used»: the card asks where, I press Home Two,
// the entry keeps it for the card alone, and the infantry stand on Home Two after the production.
// Why the check is redundant here: units otherwise enter the board only by production at a dock (67.1, 68.3); these
// are placed, so the interface has to let the player name the planet.
test('technology:yso asks where the infantry go in «Used» and places them there', async () => {
  const entry = using(tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } }), id);
  const table = bench({ faction: 'yin', start: { technologies: [id] }, entries: [entry], game: { docks: ['h1'] } });
  quote(table.pack, id, 'place up to 2 infantry from your reinforcements on any planet you control');
  const live = showUses(table, entry);
  await choose('Home Two', 'Planet');
  expect((live.entry() as { useChoices?: unknown }).useChoices).toEqual({ [id]: { place: 'h2' } });
  expect(endOf({ pack: table.pack, game: live.game() }).ground.h2?.infantry).toBe(1);
});
