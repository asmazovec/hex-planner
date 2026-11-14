import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './develop';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
const table = (technologies: string[]) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [scoring], start: { technologies } }) };
};

describe('publicObjective:develop Develop Weaponry', () => {
  // "Own 2 unit upgrade technologies."
  // Checks: Destroyer II and Gravity Drive: one unit upgrade only, so scoring is warned of.
  // Why the check is NOT redundant here: the objective is its own requirement (61.5) and counts unit upgrades only.
  test('publicObjective:develop scored with one unit upgrade is warned of', () => {
    const t = table(['technology:dd2', 'technology:gd']);
    quote(t.pack, id, 'Own 2 unit upgrade technologies.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: Destroyer II and Cruiser II: the requirement is met, nothing is warned of.
  // Why the check is redundant here: the requirement holds at the Score Objectives step (81.1).
  test('publicObjective:develop scored with two unit upgrades is not warned of', () => {
    const t = table(['technology:dd2', 'technology:cr2']);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Rulings (Nekro): owning two unit upgrades for the same type of unit only counts as one unit upgrade.
  // Checks: Carrier II and the Sol Advanced Carrier II upgrade the same unit: one, so scoring is warned of.
  // Why the check is NOT redundant here: the requirement counts the units upgraded, not the cards.
  test('publicObjective:develop two upgrades of the same unit count once', () => {
    const t = table(['technology:cv2', 'technology:ac2']);
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:develop is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
