import { test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, quote, statusTokens } from '../kit';
import { id } from './centralize_trade';

uiBench();

const table = (tradeGoods: number) => {
  const status = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  return { status, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods }), status] }) };
};

// "Spend 10 trade goods."
// Checks: the status entry that scores the objective with ten trade goods shows no shortage.
// Why nothing is shown: the cost is paid in full.
test('publicObjective:centralize_trade paid in full, the status entry shows no shortage', () => {
  const t = table(10);
  quote(t.pack, id, 'Spend 10 trade goods.');
  showWarnings(t, t.status);
  expectNotShown('shortTradeGoods');
});

// LRR 61.10: "a player must pay the specified cost at the time indicated on the card."
// Checks: with seven trade goods the status entry shows the shortage, standing: the player may still plan the score.
// Why the check is NOT redundant here: seven is fewer than ten.
test('publicObjective:centralize_trade short of ten trade goods, the status entry shows it standing', () => {
  const t = table(7);
  showWarnings(t, t.status);
  expectShownStanding('shortTradeGoods');
});

test.todo('publicObjective:centralize_trade the player picks the objective to score in the status entry: the status entry has no editor for `scored` yet');
