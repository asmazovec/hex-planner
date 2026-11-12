import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET, warningsOf } from '../kit';
import { id } from './intimidate';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');

/** The row with Mecatol Rex (tile 18) in the middle: the near and the far systems are adjacent to it. */
const table = (units: Record<string, UnitCounts>) => {
  const scoring = score();
  return {
    scoring, ...bench({
      faction: 'sol', entries: [scoring], units,
      game: { map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: '18', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
    }),
  };
};

describe('publicObjective:intimidate Intimidate Council', () => {
  // "Have 1 or more ships in 2 systems that are adjacent to Mecatol Rex's system."
  // Rulings: "Any ships in the Mecatol Rex system are irrelevant."
  // Checks: ships beside Mecatol Rex and in its own system: one adjacent system only, so scoring is warned of.
  // Why the check is NOT redundant here: the objective is its own requirement (61.5): two adjacent systems.
  test('publicObjective:intimidate scored with ships in one adjacent system and in Mecatol Rex is warned of', () => {
    const t = table({ [NEAR]: { cruiser: 1 }, [TARGET]: { cruiser: 1 } });
    quote(t.pack, id, "Have 1 or more ships in 2 systems that are adjacent to Mecatol Rex's system.");
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: ships in the near and in the far system, both adjacent to Mecatol Rex: nothing is warned of.
  // Why the check is redundant here: the requirement holds at the Score Objectives step (81.1).
  test('publicObjective:intimidate scored with ships in two systems adjacent to Mecatol Rex is not warned of', () => {
    const t = table({ [NEAR]: { cruiser: 1 }, [FAR]: { cruiser: 1 } });
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:intimidate is a play effect of the status entry', () => {
    expect(effect(table({}).pack, id).tier).toBe('play');
  });
});
