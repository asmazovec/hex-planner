import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, statusTokens, TARGET, warningsOf } from '../kit';
import { id } from './infrastructure';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
/** The board with one more planet, f1, in the far system; I control every planet of the board. */
const table = (game: Partial<Game>) => {
  const status = score();
  return {
    status,
    ...bench({
      faction: 'sol', expansions: ['pok'], entries: [status],
      edit: pack => {
        pack.tiles['p-far'] = { id: 'p-far', number: 'p-far', planetIds: ['f1'], kind: 'system', wormholes: [] };
        pack.planets.f1 = { id: 'f1', name: 'Far One', resources: 1, influence: 1 };
      },
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'p-far', [FARTHER]: 'r-empty' },
        planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'me', f1: 'me' },
        ...game,
      },
    }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:infrastructure Improve Infrastructure', () => {
  // "Have structures on 3 planets outside of your home system."
  // Checks: a PDS on t1, t2 and f1 (two of them on t1 count once): scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1); the number of structures on a planet is
  // irrelevant if there is at least one (the objective's ruling 1).
  test('publicObjective:infrastructure structures on three planets outside the home system meet it', () => {
    const t = table({ pds: { t1: 2, t2: 1 }, docks: ['f1'] });
    quote(t.pack, id, 'Have structures on 3 planets outside of your home system.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: structures on h1, h2 and t1: only t1 is outside the home system, one of three.
  // Why the check is NOT redundant here: the card leaves out the planets of the player's own home system.
  test('publicObjective:infrastructure planets of the home system do not count', () => {
    const t = table({ pds: { h2: 1, t1: 1 }, docks: ['h1'] });
    quote(t.pack, id, 'outside of your home system');
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 3 });
  });

  // Checks: four PDS on one planet are one planet with structures.
  // Why the check is NOT redundant here: the card counts planets, not structures.
  test('publicObjective:infrastructure many structures on one planet are one planet', () => {
    const t = table({ pds: { t1: 3 }, docks: ['t1'] });
    expect(unmet(t)).toMatchObject({ objective: id, have: 1, need: 3 });
  });
});
