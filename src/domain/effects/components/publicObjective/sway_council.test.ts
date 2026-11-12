import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './sway_council';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
/** The home planets give 1 + 2 influence; the rest must come from trade goods. */
const table = (before: Entry[]) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [...before, scoring] }) };
};

describe('publicObjective:sway_council Sway the Council', () => {
  // "Spend 8 influence."
  // Checks: 3 influence of planets and 4 trade goods make 7: scoring is warned of.
  // Why the check is NOT redundant here: LRR 61.10: "To score such an objective, a player must pay the specified cost".
  test.fails('publicObjective:sway_council scored with 7 influence at hand is warned of', () => {
    const t = table([adjust({ tradeGoods: 4 })]);
    quote(t.pack, id, 'Spend 8 influence.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Rulings: "Trade goods may be spent as influence when scoring Sway the Council."
  // Checks: 3 influence of planets and 5 trade goods make 8: nothing is warned of.
  // Why the check is redundant here: the cost can be paid at the Score Objectives step.
  test('publicObjective:sway_council scored with 3 influence of planets and 5 trade goods is not warned of', () => {
    const t = table([adjust({ tradeGoods: 5 })]);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  test.todo('publicObjective:sway_council which planets and trade goods pay the 8 influence is the player\'s choice: the status entry has no payment yet, so trade goods spent are not taken');

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test.fails('publicObjective:sway_council is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
