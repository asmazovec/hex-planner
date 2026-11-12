import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './diversify';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
const table = (technologies: string[]) => {
  const scoring = score();
  return { scoring, ...bench({ faction: 'sol', entries: [scoring], start: { technologies } }) };
};

describe('publicObjective:diversify Diversify Research', () => {
  // "Own 2 technologies in each of 2 colors."
  // Checks: two propulsion, one biotic, one cybernetic: only one colour has two, so scoring is warned of.
  // Why the check is NOT redundant here: the objective is its own requirement (61.5).
  test('publicObjective:diversify scored with two technologies in one colour only is warned of', () => {
    const t = table(['technology:gd', 'technology:amd', 'technology:nm', 'technology:st']);
    quote(t.pack, id, 'Own 2 technologies in each of 2 colors.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: two propulsion and two biotic: the requirement is met, nothing is warned of.
  // Why the check is redundant here: the requirement holds at the Score Objectives step (81.1).
  test('publicObjective:diversify scored with two propulsion and two biotic technologies is not warned of', () => {
    const t = table(['technology:gd', 'technology:amd', 'technology:nm', 'technology:dxa']);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // LRR 90.7.2: "Unit upgrades do not have a color and do not satisfy prerequisites."
  // Checks: two propulsion and two unit upgrades: the upgrades are no colour, so scoring is warned of.
  // Why the check is NOT redundant here: only coloured technologies count.
  test('publicObjective:diversify unit upgrades are of no colour', () => {
    const t = table(['technology:gd', 'technology:amd', 'technology:dd2', 'technology:cr2']);
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:diversify is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
