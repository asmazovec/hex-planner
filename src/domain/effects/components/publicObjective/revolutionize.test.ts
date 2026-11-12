import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './revolutionize';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (technologies: string[]) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', start: { technologies }, entries: [status] }) };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:revolutionize Revolutionize Warfare', () => {
  // "Own 3 unit upgrade technologies."
  // Checks: Cruiser II, Destroyer II and Dreadnought II: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:revolutionize three unit upgrades meet it', () => {
    const t = table(['technology:cr2', 'technology:dd2', 'technology:dn2']);
    quote(t.pack, id, 'Own 3 unit upgrade technologies.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: two unit upgrades and two technologies of a colour: two of three.
  // Why the check is NOT redundant here: LRR 90.6, "Some technologies are unit upgrades"; Gravity Drive and Assault
  // Cannon are not.
  test.fails('publicObjective:revolutionize technologies that are not unit upgrades do not count', () => {
    const t = table(['technology:cr2', 'technology:dd2', 'technology:gd', 'technology:asc']);
    quote(t.pack, id, 'unit upgrade technologies');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 2, need: 3 });
  });
});
