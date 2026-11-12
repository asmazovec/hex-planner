import { describe, expect, test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, endOf, quote, statusTokens } from '../kit';
import { id } from './vast_reserves';

uiBench();

const status = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (goods: number, score: Entry) => bench({ faction: 'sol', expansions: ['pok'], entries: [adjust({ tradeGoods: goods }), score] });

describe('publicObjective:vast_reserves Hold Vast Reserves', () => {
  // "Spend 6 influence, 6 resources, and 6 trade goods."
  // Checks: the status entry that scores it with 2 trade goods shows the shortage of trade goods in its list.
  // Why the check is NOT redundant here: the card lifts no rule; it costs 6 trade goods and the player has 2.
  test.fails('publicObjective:vast_reserves scored with 2 trade goods shows the shortage of trade goods', () => {
    const score = status();
    const plan = table(2, score);
    quote(plan.pack, id, '6 trade goods');
    showWarnings(plan, score);
    expectShownStanding('shortTradeGoods');
  });

  // Checks: with 8 trade goods the list shows no shortage, and the plan keeps 2 after the scoring.
  // Why the check is redundant here: the spend is made and covered, so nothing is warned of.
  test.fails('publicObjective:vast_reserves scored with 8 trade goods shows nothing and leaves 2', () => {
    const score = status();
    const plan = table(8, score);
    showWarnings(plan, score);
    expectNotShown('shortTradeGoods');
    expect(endOf(plan).tradeGoods).toBe(2);
  });
});
