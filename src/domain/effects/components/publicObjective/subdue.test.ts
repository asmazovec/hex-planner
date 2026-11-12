import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './subdue';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** Nine more planets m1-m9 in the far system: with t1 and t2, eleven planets outside any home system. */
const MANY = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'];

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (controlled: string[]) => {
  const status = score();
  return {
    status,
    ...bench({
      faction: 'sol', entries: [status],
      edit: pack => {
        pack.tiles['p-many'] = { id: 'p-many', number: 'p-many', planetIds: MANY, kind: 'system', wormholes: [] };
        for (const planet of MANY) pack.planets[planet] = { id: planet, name: planet, resources: 1, influence: 1 };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'p-many', [FARTHER]: 'r-empty' },
        planetControl: Object.fromEntries(controlled.map(planet => [planet, 'me' as const])),
      },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:subdue Subdue the Galaxy', () => {
  // "Control 11 planets in non-home systems."
  // Checks: t1, t2 and m1-m9: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:subdue eleven planets outside home systems meet it', () => {
    const t = table(['h1', 'h2', 't1', 't2', ...MANY]);
    quote(t.pack, id, 'Control 11 planets in non-home systems.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: twelve planets controlled, two of them in my home system: ten of eleven.
  // Why the check is NOT redundant here: the planets cannot be in any player's home system (the objective's ruling 1).
  test.fails('publicObjective:subdue home planets do not count', () => {
    const t = table(['h1', 'h2', 't1', ...MANY]);
    quote(t.pack, id, 'non-home systems');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 10, need: 11 });
  });
});
