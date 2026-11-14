import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectNone, expectStanding, FAR, HOME, NEAR, quote, statusTokens, warningsOf } from '../kit';
import { id } from './engineer_marvel';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (units: Record<string, UnitCounts>) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], units, entries: [status] }) };
};

describe('publicObjective:engineer_marvel Engineer a Marvel', () => {
  // "Have your flagship or a war sun on the game board."
  // Checks: a war sun anywhere on the board: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:engineer_marvel a war sun on the board meets it', () => {
    const t = table({ [FAR]: { warsun: 1 } });
    quote(t.pack, id, 'Have your flagship or a war sun on the game board.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // "Have your flagship ..."
  // Checks: the flagship alone meets it too.
  // Why nothing is warned: either unit is enough.
  test('publicObjective:engineer_marvel the flagship alone meets it', () => {
    const t = table({ [NEAR]: { flagship: 1 } });
    expectNone(warningsOf(t, t.status), UNMET);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: a fleet of dreadnoughts and carriers, no flagship, no war sun: warned of.
  // Why the check is NOT redundant here: no unit on the board is one the card names.
  test('publicObjective:engineer_marvel neither a flagship nor a war sun is warned of', () => {
    const t = table({ [HOME]: { dreadnought: 3, carrier: 2 } });
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 0, need: 1 });
  });
});
