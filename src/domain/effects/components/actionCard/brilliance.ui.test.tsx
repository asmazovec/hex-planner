import { expect, test } from 'vitest';
import { choose, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, HOME, quote, tactical } from '../kit';
import { id } from './brilliance';

uiBench();

// "Ready 1 of your planets that has a technology specialty or choose 1 player to gain their breakthrough."
// Checks: the editor of the component action that plays the card offers my planet with a specialty (Home One, exhausted
// by the purchase before), and a press chooses it; the choice is written into the entry.
// Why the check is redundant here: nothing is lifted; the player must be able to say which planet the card readies.
test('actionCard:brilliance the component action offers the exhausted Home One to ready', async () => {
  const entry = componentAction(id);
  const table = bench({
    faction: 'sol', expansions: ['te'], start: { hand: [id] },
    entries: [tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } }), entry],
    game: { docks: ['h1'], planetControl: { h1: 'me' } },
    edit: pack => { pack.planets.h1 = { ...pack.planets.h1, tech: ['cybernetic'] }; },
  });
  quote(table.pack, id, 'Ready 1 of your planets that has a technology specialty');
  const live = showTurn(table, entry);
  await choose('Home One');
  expect(live.entry().choices).toEqual({ planet: 'h1' });
});
