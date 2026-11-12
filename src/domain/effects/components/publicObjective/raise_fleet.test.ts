import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, statusTokens, warningsOf } from '../kit';
import { id } from './raise_fleet';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** The status entry of round 1 that scores the objective. */
const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (units: Record<string, UnitCounts>) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], units, entries: [status] }) };
};

describe('publicObjective:raise_fleet Raise a Fleet', () => {
  // "Have 5 or more non-fighter ships in 1 system."
  // Checks: five non-fighter ships in the home system: scoring the objective makes no warning, and it joins the scored.
  // Why nothing is warned: the requirement holds on the board of the Score Objectives step (81.1).
  test('publicObjective:raise_fleet five non-fighter ships in one system meet it', () => {
    const t = table({ [HOME]: { cruiser: 3, destroyer: 2 } });
    quote(t.pack, id, 'Have 5 or more non-fighter ships in 1 system.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: four ships and three fighters in one system: scoring is warned of with what is had and what is needed,
  // and the objective is still scored, as the plan forbids nothing.
  // Why the check is NOT redundant here: fighters are not "non-fighter ships"; four is one short of the card.
  test.fails('publicObjective:raise_fleet fighters do not count: four ships and three fighters are warned of', () => {
    const t = table({ [HOME]: { cruiser: 4, fighter: 3 } });
    quote(t.pack, id, 'non-fighter ships');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 4, need: 5 });
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // "... in 1 system."
  // Checks: three ships in one system and three in the next are not five in one.
  // Why the check is NOT redundant here: the card counts the ships of a single system, not the whole board.
  test.fails('publicObjective:raise_fleet ships spread over two systems do not add up', () => {
    const t = table({ [HOME]: { cruiser: 3 }, [NEAR]: { destroyer: 3 } });
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 3, need: 5 });
  });

  // Checks: the objective is known to the registry; pass 1 leaves it the hint it is today.
  test('publicObjective:raise_fleet has an effect in the registry', () => {
    const t = table({});
    expect(effect(t.pack, id).rule).toBeTruthy();
  });
});
