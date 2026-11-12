import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, PlanetDef } from '../../../types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './brain_trust';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** Five planets m1-m5 in the far system: m1-m4 have a technology specialty (m1 two of them), m5 none. */
const MANY: Record<string, Partial<PlanetDef>> = {
  m1: { tech: ['biotic', 'warfare'] }, m2: { tech: ['propulsion'] }, m3: { tech: ['cybernetic'] }, m4: { tech: ['warfare'] }, m5: {},
};

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (controlled: string[]) => {
  const status = score();
  return {
    status,
    ...bench({
      faction: 'sol', entries: [status],
      edit: pack => {
        pack.tiles['p-many'] = { id: 'p-many', number: 'p-many', planetIds: Object.keys(MANY), kind: 'system', wormholes: [] };
        for (const [planet, extra] of Object.entries(MANY)) pack.planets[planet] = { id: planet, name: planet, resources: 1, influence: 1, ...extra };
        pack.planets.t1 = { ...pack.planets.t1, tech: ['biotic'] };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'p-many', [FARTHER]: 'r-empty' },
        planetControl: Object.fromEntries(controlled.map(planet => [planet, 'me' as const])),
      },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:brain_trust Form Galactic Brain Trust', () => {
  // "Control 5 planets that have technology specialties."
  // Checks: t1 and m1-m4, each with a specialty: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1); the number of specialties of a planet is
  // irrelevant if it has at least one (the objective's ruling 1).
  test('publicObjective:brain_trust five planets with specialties meet it', () => {
    const t = table(['h1', 'h2', 't1', 'm1', 'm2', 'm3', 'm4']);
    quote(t.pack, id, 'Control 5 planets that have technology specialties.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: eight planets controlled, but only m1-m4 have a specialty: four of five.
  // Why the check is NOT redundant here: planets without a specialty (the home planets, t2, m5) are outside the card,
  // and m1's two specialties are one planet.
  test('publicObjective:brain_trust planets without a specialty do not count', () => {
    const t = table(['h1', 'h2', 't2', 'm1', 'm2', 'm3', 'm4', 'm5']);
    quote(t.pack, id, 'planets that have technology specialties');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 4, need: 5 });
  });
});
