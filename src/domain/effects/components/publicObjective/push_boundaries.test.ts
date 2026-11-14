import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './push_boundaries';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
/**
 * I control h1, h2 and t1 (three planets). Hacan controls t2, beside my t1 in the target system; Jol-Nar controls
 * planets of the far system, next to the target: both are my neighbours (LRR 60.1).
 */
const table = (jolnarPlanets: string[]) => {
  const status = score();
  const planetControl: Game['planetControl'] = { h1: 'me', h2: 'me', t1: 'me', t2: 'enemy' };
  const planetOwner: Game['planetOwner'] = { t2: 'hacan' };
  for (const planet of jolnarPlanets) { planetControl[planet] = 'enemy'; planetOwner[planet] = 'jolnar'; }
  return {
    status,
    ...bench({
      faction: 'sol', expansions: ['pok'], entries: [status],
      edit: pack => {
        pack.tiles['p-far'] = { id: 'p-far', number: 'p-far', planetIds: ['f1', 'f2', 'f3', 'f4'], kind: 'system', wormholes: [] };
        for (const planet of ['f1', 'f2', 'f3', 'f4']) pack.planets[planet] = { id: planet, name: planet, resources: 1, influence: 1 };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'p-far', [FARTHER]: 'r-empty' },
        opponents: [
          { id: 'hacan', faction: 'hacan', vp: 0, seat: 4, color: 2 },
          { id: 'jolnar', faction: 'jolnar', vp: 0, seat: 5, color: 3 },
        ],
        planetControl, planetOwner,
      },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:push_boundaries Push Boundaries', () => {
  // "Control more planets than each of 2 of your neighbors."
  // Checks: three planets against Hacan's one and Jol-Nar's one: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:push_boundaries more planets than two neighbours meets it', () => {
    const t = table(['f1']);
    quote(t.pack, id, 'Control more planets than each of 2 of your neighbors.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: Jol-Nar controls four planets, more than my three: only one neighbour has fewer, one of two.
  // Why the check is NOT redundant here: the card asks more planets than each of two neighbours.
  test('publicObjective:push_boundaries a neighbour with more planets does not count', () => {
    const t = table(['f1', 'f2', 'f3', 'f4']);
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 2 });
  });

  // "... more planets than ..."
  // Checks: Jol-Nar with three planets, as many as mine, is not fewer.
  // Why the check is NOT redundant here: a tie is not "more".
  test('publicObjective:push_boundaries a neighbour with as many planets does not count', () => {
    const t = table(['f1', 'f2', 'f3']);
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 2 });
  });
});
