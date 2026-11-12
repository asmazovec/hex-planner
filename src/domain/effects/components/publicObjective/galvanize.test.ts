import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './galvanize';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/**
 * The status entry that scores the objective and pays for it. `spend` is the field pass 2 adds to the status entry:
 * here the tokens taken from the tactic and the strategy pools.
 */
const scoring = (tactic: number, strategy: number): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spend: { tactic, strategy } } as unknown as Entry);
/** The pools start at 3 tactic, 3 fleet, 2 strategy; two more tactic tokens in the action phase make 5, 3, 2. */
const table = (status: Entry) => ({ status, ...bench({ faction: 'sol', entries: [adjust({ tactic: 2 }), status] }) });

describe('publicObjective:galvanize Galvanize the People', () => {
  // "Spend a total of 6 tokens from your tactic and/or strategy pools."
  // LRR 61.10: "To score such an objective, a player must pay the specified cost at the time indicated on the card."
  // Checks: four tactic and two strategy tokens are spent: nothing is warned of, the pools are left at 1 and 0.
  // Why the count changes here: the objective is the cost, taken from the pools it names.
  test.fails('publicObjective:galvanize six tokens from the tactic and strategy pools are spent', () => {
    const t = table(scoring(4, 2));
    quote(t.pack, id, 'Spend a total of 6 tokens from your tactic and/or strategy pools.');
    expectNone(warningsOf(t, t.status), UNMET);
    expectNone(warningsOf(t, t.status), 'poolNegative');
    expect(endOf(t)).toMatchObject({ tactic: 1, strategy: 0, fleet: 3 });
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.10, as above.
  // Checks: five tokens spent are warned of, five of six.
  // Why the check is NOT redundant here: the card asks a total of six.
  test.fails('publicObjective:galvanize five tokens are short of six', () => {
    const t = table(scoring(3, 2));
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 5, need: 6 });
  });

  // LRR 20.4 and the card's "from your tactic and/or strategy pools".
  // Checks: six tokens taken from a tactic pool of five is warned of as a pool below zero.
  // Why the check is NOT redundant here: a pool cannot give tokens it does not hold.
  test.fails('publicObjective:galvanize a pool cannot give more tokens than it holds', () => {
    const t = table(scoring(6, 0));
    expectStanding(warningsOf(t, t.status), 'poolNegative');
  });

  // Checks: the objective is played by the status entry that scores it.
  test.fails('publicObjective:galvanize is a play effect', () => {
    expect(effect(table(scoring(0, 0)).pack, id).tier).toBe('play');
  });
});
