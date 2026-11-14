import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './deep_space';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
/** The board: NEAR, FAR and FARTHER hold no planets; HOME and TARGET do. */
const table = (units: Record<string, UnitCounts>) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], units, entries: [status] }) };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:deep_space Explore Deep Space', () => {
  // "Have units in 3 systems that do not contain planets."
  // Checks: one destroyer in each of the three empty systems: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1); the number of units in a system is
  // irrelevant if there is at least one (the objective's ruling 1).
  test('publicObjective:deep_space a unit in each of three systems without planets meets it', () => {
    const t = table({ [NEAR]: { destroyer: 1 }, [FAR]: { destroyer: 1 }, [FARTHER]: { fighter: 1, carrier: 1 } });
    quote(t.pack, id, 'Have units in 3 systems that do not contain planets.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: units in two empty systems and in the target, which holds planets: warned of, two of three.
  // Why the check is NOT redundant here: the target system contains planets, so it is outside the card.
  test('publicObjective:deep_space a system with planets does not count', () => {
    const t = table({ [NEAR]: { destroyer: 1 }, [FAR]: { destroyer: 1 }, [TARGET]: { destroyer: 1 } });
    quote(t.pack, id, 'systems that do not contain planets');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 2, need: 3 });
  });

  // Checks: many ships in one empty system are still one system.
  // Why the check is NOT redundant here: the card counts systems, not units.
  test('publicObjective:deep_space many units in one empty system are one system', () => {
    const t = table({ [HOME]: { dreadnought: 2 }, [NEAR]: { destroyer: 5 } });
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 3 });
  });
});
