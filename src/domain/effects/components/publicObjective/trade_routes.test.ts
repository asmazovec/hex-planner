import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './trade_routes';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
const table = (tradeGoods: number) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [adjust({ tradeGoods }), scoring] }) };
};

describe('publicObjective:trade_routes Negotiate Trade Routes', () => {
  // "Spend 5 trade goods."
  // Checks: scoring it with 6 trade goods spends 5 of them: 1 is left.
  // Why the check is redundant here: nothing is lifted; LRR 61.10 has the cost paid, and trade goods spent do not come
  // back with the planets readied at the end of the status phase, so the plan must take them.
  test.fails('publicObjective:trade_routes scoring spends 5 trade goods', () => {
    const t = table(6);
    quote(t.pack, id, 'Spend 5 trade goods.');
    expect(endOf(t).tradeGoods).toBe(1);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Checks: 4 trade goods are not enough: scoring is warned of.
  // Why the check is NOT redundant here: LRR 61.10: "To score such an objective, a player must pay the specified cost".
  test.fails('publicObjective:trade_routes scored with 4 trade goods is warned of', () => {
    const t = table(4);
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which spends and checks.
  test.fails('publicObjective:trade_routes is a play effect of the status entry', () => {
    expect(effect(table(0).pack, id).tier).toBe('play');
  });
});
