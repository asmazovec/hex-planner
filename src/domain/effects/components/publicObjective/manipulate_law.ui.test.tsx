import { test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './manipulate_law';

uiBench();

/** `spend` is the field pass 2 adds to the status entry: the cost of the public objective scored. */
const table = (influence: Payment) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id], spend: { influence: { planets: influence.planets, tradeGoods: 0 }, tradeGoods: influence.tradeGoods } } as unknown as Entry;
  return { status, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods: 12 }), status], game: { planetControl: { h2: 'me', t2: 'me' } } }) };
};

// "Spend 16 influence."
// Checks: h2, t2 and eleven trade goods pay the 16: the status entry shows no shortage.
// Why nothing is shown: the cost is paid in full.
test('publicObjective:manipulate_law paid in full, the status entry shows no shortage', () => {
  const t = table({ planets: ['h2', 't2'], tradeGoods: 11 });
  quote(t.pack, id, 'Spend 16 influence.');
  showWarnings(t, t.status);
  expectNotShown('shortInfluence');
});

// LRR 61.10: "a player must pay the specified cost at the time indicated on the card."
// Checks: 15 influence shown short, standing: the player may still plan the score.
// Why the check is NOT redundant here: 15 is less than 16.
test('publicObjective:manipulate_law short of sixteen influence, the status entry shows it standing', () => {
  const t = table({ planets: ['h2', 't2'], tradeGoods: 10 });
  showWarnings(t, t.status);
  expectShownStanding('shortInfluence');
});

test.todo('publicObjective:manipulate_law the player scores the objective and picks its payment in the status entry: the status entry has no editor for `scored` and `spend` yet');
