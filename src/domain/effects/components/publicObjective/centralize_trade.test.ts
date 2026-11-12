import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './centralize_trade';

/** The status entry of round 1, scoring the objective or not. */
const status = (scored: string[]): Entry => ({ ...statusTokens(0, 0, 0), scored } as Entry);
/** I gain `tradeGoods` in the action phase, then the status entry comes. */
const table = (tradeGoods: number, scored: string[] = [id]) => {
  const entry = status(scored);
  return { status: entry, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods }), entry] }) };
};

describe('publicObjective:centralize_trade Centralize Galactic Trade', () => {
  // "Spend 10 trade goods."
  // LRR 61.10: "To score such an objective, a player must pay the specified cost at the time indicated on the card."
  // Checks: with twelve trade goods, scoring the objective spends ten of them: two are left, nothing is warned of.
  // Why the count changes here: the objective is the cost; without it nothing takes trade goods at the status phase.
  test('publicObjective:centralize_trade scoring spends ten trade goods', () => {
    const t = table(12);
    quote(t.pack, id, 'Spend 10 trade goods.');
    expectNone(warningsOf(t, t.status), 'shortTradeGoods');
    expect(endOf(t).tradeGoods).toBe(2);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.10, as above.
  // Checks: with seven trade goods the cost cannot be paid: the shortage is warned of on the status entry, and the
  // objective is scored all the same, as the plan forbids nothing.
  // Why the check is NOT redundant here: seven trade goods are fewer than the ten the card asks.
  test('publicObjective:centralize_trade seven trade goods are short of the ten', () => {
    const t = table(7);
    expectStanding(warningsOf(t, t.status), 'shortTradeGoods');
    expect(warningsOf(t, t.status).find(w => w.code === 'shortTradeGoods')).toMatchObject({ params: { needed: 10, have: 7 }, step: 'status' });
    expect(endOf(t).tradeGoods).toBe(0);
  });

  // The objective's ruling 1: "The trade goods must be spent during the status phase."
  // Checks: a status entry that scores nothing takes no trade goods.
  // Why the count does NOT change here: the objective is not scored, so its cost is not paid.
  test('publicObjective:centralize_trade not scored, it takes nothing', () => {
    const t = table(12, []);
    expect(endOf(t).tradeGoods).toBe(12);
  });

  // Checks: the objective is played by the status entry that scores it.
  test('publicObjective:centralize_trade is a play effect', () => {
    expect(effect(table(0).pack, id).tier).toBe('play');
  });
});
