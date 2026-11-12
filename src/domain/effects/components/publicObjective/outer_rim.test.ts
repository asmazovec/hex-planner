import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, UnitCounts } from '../../../types';
import { bench, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './outer_rim';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

/**
 * A galaxy of two rings around the target: the nineteen slots within two steps of 0,0, my home on the outer ring at
 * 2,0. The outer ring is the edge of the game board: each of its slots lacks a neighbour on the map.
 */
const RING_HOME = '2,0';
const map: Record<string, string> = {};
for (let q = -2; q <= 2; q += 1) {
  for (let r = -2; r <= 2; r += 1) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 2) map[`${q},${r}`] = 'r-empty';
  }
}
map['0,0'] = 'r-target';
map[RING_HOME] = 'r-home';

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (units: Record<string, UnitCounts>) => {
  const status = score();
  return { status, ...bench({ faction: 'sol', expansions: ['pok'], units, entries: [status], game: { map: { ...map } } }) };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:outer_rim Populate the Outer Rim', () => {
  // "Have units in 3 systems on the edge of the game board other than your home system."
  // Checks: a destroyer in three systems of the outer ring, none of them home: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:outer_rim units in three edge systems meet it', () => {
    const t = table({ '-2,0': { destroyer: 1 }, '0,-2': { destroyer: 1 }, '0,2': { destroyer: 1 } });
    quote(t.pack, id, 'Have units in 3 systems on the edge of the game board other than your home system.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: units at home, in two edge systems and in a system of the inner ring: two of three.
  // Why the check is NOT redundant here: the card leaves out the home system, and an inner system is not on the edge.
  test('publicObjective:outer_rim the home system and inner systems do not count', () => {
    const t = table({ [RING_HOME]: { carrier: 1 }, '-2,0': { destroyer: 1 }, '0,2': { destroyer: 1 }, '1,0': { destroyer: 1 } });
    quote(t.pack, id, 'other than your home system');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 2, need: 3 });
  });

  test.todo('publicObjective:outer_rim an edge touching a hyperlane is not the edge of the board (ruling 6): the board has no notion of its edge yet');
});
