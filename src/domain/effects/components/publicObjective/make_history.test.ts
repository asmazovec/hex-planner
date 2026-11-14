import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './make_history';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
/** The board with Mecatol Rex (tile 18) next to home and a gravity rift in the far system. */
const table = (units: Record<string, UnitCounts>) => {
  const status = score();
  return {
    status,
    ...bench({
      faction: 'sol', expansions: ['pok'], units, entries: [status],
      game: { map: { [HOME]: 'r-home', [NEAR]: '18', [TARGET]: 'r-target', [FAR]: 'r-rift', [FARTHER]: 'r-empty' } },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:make_history Make History', () => {
  // "Have units in 2 systems that contain legendary planets, Mecatol Rex, or anomalies."
  // Checks: a cruiser in the Mecatol Rex system (the planet not controlled) and one in the gravity rift: no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1); ships in the Mecatol Rex system count
  // without controlling the planet (the objective's ruling 2.2).
  test('publicObjective:make_history units in the Mecatol Rex system and in an anomaly meet it', () => {
    const t = table({ [NEAR]: { cruiser: 1 }, [FAR]: { cruiser: 1 } });
    quote(t.pack, id, 'Have units in 2 systems that contain legendary planets, Mecatol Rex, or anomalies.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: units in the Mecatol Rex system and in the ordinary target system: one of two.
  // Why the check is NOT redundant here: the target holds neither a legendary planet, nor Mecatol Rex, nor an anomaly.
  test('publicObjective:make_history an ordinary system does not count', () => {
    const t = table({ [NEAR]: { cruiser: 1 }, [TARGET]: { cruiser: 1 } });
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 2 });
  });

  // Checks: two systems are needed; units in the rift alone are one.
  // Why the check is NOT redundant here: the card asks two such systems.
  test('publicObjective:make_history one qualifying system is not enough', () => {
    const t = table({ [FAR]: { cruiser: 3 } });
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 2 });
  });
});
