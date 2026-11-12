import { test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './golden_age';

uiBench();

/** `spend` is the field pass 2 adds to the status entry: the cost of the public objective scored. */
const table = (resources: Payment) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id], spend: { resources: { planets: resources.planets, tradeGoods: 0 }, tradeGoods: resources.tradeGoods } } as unknown as Entry;
  return { status, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods: 12 }), status], game: { planetControl: { h1: 'me', t1: 'me' } } }) };
};

// "Spend 16 resources."
// Checks: h1, t1 and eleven trade goods pay the 16: the status entry shows no shortage.
// Why nothing is shown: the cost is paid in full.
test('publicObjective:golden_age paid in full, the status entry shows no shortage', () => {
  const t = table({ planets: ['h1', 't1'], tradeGoods: 11 });
  quote(t.pack, id, 'Spend 16 resources.');
  showWarnings(t, t.status);
  expectNotShown('shortResources');
});

// LRR 61.10: "a player must pay the specified cost at the time indicated on the card."
// Checks: 13 resources shown short, standing: the player may still plan the score.
// Why the check is NOT redundant here: 13 is less than 16.
test('publicObjective:golden_age short of sixteen resources, the status entry shows it standing', () => {
  const t = table({ planets: ['h1'], tradeGoods: 10 });
  showWarnings(t, t.status);
  expectShownStanding('shortResources');
});

test.todo('publicObjective:golden_age the player scores the objective and picks its payment in the status entry: the status entry has no editor for `scored` and `spend` yet');
