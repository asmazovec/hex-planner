import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './lead';

/** Scoring an objective whose requirement is not met: the code made by the status step (LRR 61.5.1, 81.1). */
const CODE = 'objectiveUnmet' as AnyWarningCode;
/** The status entry that scores the objective; `spend` is what it pays from the tactic and the strategy pools. */
const scoring = (tactic: number, strategy: number): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spend: { tactic, strategy } } as unknown as Entry);
/** The plan starts with 3 tactic, 3 fleet and 2 strategy tokens. */
const table = (status: Entry) => ({ status, ...bench({ faction: 'sol', entries: [status] }) });

describe('publicObjective:lead Lead From the Front', () => {
  // "Spend a total of 3 tokens from your tactic and/or strategy pools."
  // LRR 61.10: the player pays the cost on the card. Checks: 2 tactic and 1 strategy token spent leave 1 and 1 and nothing is warned of.
  // Why the count changes here: the objective is the cost, taken from the pools it names (the playthroughs found it never taken).
  test('publicObjective:lead 3 tokens spent leave the pools', () => {
    const t = table(scoring(2, 1));
    quote(t.pack, id, 'Spend a total of 3 tokens from your tactic and/or strategy pools.');
    expectNone(warningsOf(t, t.status), CODE);
    expect(endOf(t)).toMatchObject({ tactic: 1, strategy: 1, fleet: 3 });
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // Checks: 2 tokens entered are short of 3: scoring is warned of.
  test('publicObjective:lead 2 tokens spent are short of 3', () => {
    const t = table(scoring(1, 1));
    expectStanding(warningsOf(t, t.status), CODE);
    expect(warningsOf(t, t.status).find(w => w.code === CODE)?.params).toMatchObject({ objective: id, have: 2, need: 3 });
  });

  // Checks: nothing entered is warned of even when the pools hold the tokens: the player pays at the Score Objectives step.
  test('publicObjective:lead scored with nothing spent is warned of', () => {
    const t = table(scoring(0, 0));
    expectStanding(warningsOf(t, t.status), CODE);
  });

  // LRR 20.4: a pool cannot give more tokens than it holds.
  test('publicObjective:lead a pool cannot give more tokens than it holds', () => {
    const t = table(scoring(0, 3));
    expectStanding(warningsOf(t, t.status), 'poolNegative');
  });

  // Checks: the objective is played by the status entry that scores it.
  test('publicObjective:lead is a play effect of the status entry', () => {
    expect(effect(table(scoring(0, 0)).pack, id).tier).toBe('play');
  });
});
