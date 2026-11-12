import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './lead';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
/** The plan starts with 3 tactic, 3 fleet and 2 strategy tokens. */
const table = (before: Entry[]) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [...before, scoring] }) };
};

describe('publicObjective:lead Lead From the Front', () => {
  // "Spend a total of 3 tokens from your tactic and/or strategy pools."
  // Checks: the tactic tokens moved to the fleet pool leave 2 strategy tokens: scoring is warned of.
  // Why the check is NOT redundant here: LRR 61.10 has the cost paid, and tokens of the fleet pool do not count.
  test('publicObjective:lead scored with 2 tokens in the tactic and strategy pools is warned of', () => {
    const t = table([adjust({ tactic: -3, fleet: 3 })]);
    quote(t.pack, id, 'Spend a total of 3 tokens from your tactic and/or strategy pools.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: 3 tactic and 2 strategy tokens: the cost can be paid, nothing is warned of.
  // Why the check is redundant here: the tokens are at hand at the Score Objectives step (81.1).
  test('publicObjective:lead scored with 5 tokens in the tactic and strategy pools is not warned of', () => {
    const t = table([]);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  test.todo('publicObjective:lead the 3 tokens spent leave the pools the player chooses: the status entry has no field for that choice yet (its own numbers can lower the pools by hand)');

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:lead is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
