import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, PlanetTrait } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './unify_colonies';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/** Planets m1-m8 in the far system: six industrial, two hazardous. */
const MANY: Record<string, PlanetTrait> = {
  m1: 'industrial', m2: 'industrial', m3: 'industrial', m4: 'industrial', m5: 'industrial', m6: 'industrial', m7: 'hazardous', m8: 'hazardous',
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
        for (const [planet, trait] of Object.entries(MANY)) pack.planets[planet] = { id: planet, name: planet, resources: 1, influence: 1, traits: [trait] };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'p-many', [FARTHER]: 'r-empty' },
        planetControl: Object.fromEntries(controlled.map(planet => [planet, 'me' as const])),
      },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:unify_colonies Unify the Colonies', () => {
  // "Control 6 planets that each have the same planet trait."
  // Checks: the six industrial planets m1-m6: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:unify_colonies six planets of one trait meet it', () => {
    const t = table(['h1', 'h2', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    quote(t.pack, id, 'Control 6 planets that each have the same planet trait.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: five industrial and two hazardous planets, and home planets without traits: five of six.
  // Why the check is NOT redundant here: the six must share one trait; planets of another trait, or of none, do not
  // add to it.
  test('publicObjective:unify_colonies planets of different traits do not add up', () => {
    const t = table(['h1', 'h2', 'm1', 'm2', 'm3', 'm4', 'm5', 'm7', 'm8']);
    quote(t.pack, id, 'the same planet trait');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 5, need: 6 });
  });
});
