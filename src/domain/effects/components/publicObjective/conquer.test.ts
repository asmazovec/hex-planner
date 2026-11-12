import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './conquer';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
/** Hacan sits at the far system, whose home tile holds the planet o1. */
const table = (planetControl: Game['planetControl']) => {
  const status = score();
  return {
    status,
    ...bench({
      faction: 'sol', entries: [status],
      edit: pack => {
        pack.tiles['r-home2'] = { id: 'r-home2', number: 'r-home2', planetIds: ['o1'], kind: 'home', wormholes: [] };
        pack.planets.o1 = { id: 'o1', name: 'Other Home', resources: 4, influence: 4 };
        pack.factions.hacan = { ...pack.factions.hacan, homeTile: 'r-home2', startUnits: {}, startingTech: [] };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-home2', [FARTHER]: 'r-empty' },
        opponents: [{ id: 'hacan', faction: 'hacan', vp: 0, seat: 2, color: 2 }],
        planetControl,
      },
    }),
  };
};

describe('publicObjective:conquer Conquer the Weak', () => {
  // "Control 1 planet that is in another player's home system."
  // Checks: I control o1 in the Hacan home system: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:conquer a planet of another player\'s home system meets it', () => {
    const t = table({ h1: 'me', h2: 'me', o1: 'me' });
    quote(t.pack, id, "Control 1 planet that is in another player's home system.");
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: my own home planets and both target planets, but nothing of the Hacan home: warned of, none of one.
  // Why the check is NOT redundant here: my own home system is not "another player's", the target is no home system.
  test('publicObjective:conquer my own home and other systems are warned of', () => {
    const t = table({ h1: 'me', h2: 'me', t1: 'me', t2: 'me', o1: 'enemy' });
    quote(t.pack, id, "another player's home system");
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(warningsOf(t, t.status).find(w => w.code === UNMET)?.params).toMatchObject({ objective: id, have: 0, need: 1 });
  });
});
