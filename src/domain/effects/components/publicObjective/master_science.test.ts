import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './master_science';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** Two technologies of each colour: propulsion, biotic, cybernetic, warfare. */
const PROPULSION = ['technology:gd', 'technology:amd'];
const BIOTIC = ['technology:nm', 'technology:dxa'];
const CYBERNETIC = ['technology:st', 'technology:gls'];
const WARFARE = ['technology:asc', 'technology:da'];

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (technologies: string[]) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', start: { technologies }, entries: [status] }) };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:master_science Master the Sciences', () => {
  // "Own 2 technologies in each of 4 colors."
  // Checks: two technologies of each of the four colours: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:master_science two technologies of each colour meet it', () => {
    const t = table([...PROPULSION, ...BIOTIC, ...CYBERNETIC, ...WARFARE]);
    quote(t.pack, id, 'Own 2 technologies in each of 4 colors.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: two of three colours and one warfare technology: three colours of four.
  // Why the check is NOT redundant here: one technology of a colour is not two.
  test('publicObjective:master_science one technology of a colour is warned of', () => {
    const t = table([...PROPULSION, ...BIOTIC, ...CYBERNETIC, WARFARE[0]]);
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 3, need: 4 });
  });

  // LRR 90.7.2: "Unit upgrades do not have a color and do not satisfy prerequisites." With the card's "in each of 4 colors".
  // Checks: unit upgrades in place of the warfare technologies add no colour.
  // Why the check is NOT redundant here: a unit upgrade has no colour (TechDef.type is null), so it is in none of the four.
  test('publicObjective:master_science unit upgrades have no colour', () => {
    const t = table([...PROPULSION, ...BIOTIC, ...CYBERNETIC, 'technology:cr2', 'technology:dd2', 'technology:ws']);
    quote(t.pack, id, 'in each of 4 colors');
    expect(unmet(t)).toMatchObject({ objective: id, have: 3, need: 4 });
  });
});
