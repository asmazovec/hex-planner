import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, Game } from '../../../types';
import { bench, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './build_defenses';

/** The code pass 2 adds (src/domain/rules/codes/objectiveUnmet.ts, LRR 61.5.1 and 81.1, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;

const score = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (game: Partial<Game>) => {
  const status = score();
  return {
    status,
    ...bench({ faction: 'sol', expansions: ['pok'], entries: [status], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' }, ...game } }),
  };
};
const unmet = (t: ReturnType<typeof table>) => warningsOf(t, t.status).find(w => w.code === UNMET)?.params;

describe('publicObjective:build_defenses Build Defenses', () => {
  // "Have 4 or more structures."
  // Checks: a space dock and three PDS on my planets: scoring makes no warning.
  // Why nothing is warned: the requirement holds when it is scored (81.1).
  test('publicObjective:build_defenses a space dock and three PDS meet it', () => {
    const t = table({ docks: ['h1'], pds: { h1: 2, t1: 1 } });
    quote(t.pack, id, 'Have 4 or more structures.');
    expectNone(warningsOf(t, t.status), UNMET);
    expect(endOf(t).holdings.scored).toContain(id);
  });

  // LRR 61.5.1: "they must fulfill the requirement on the card during the Score Objectives step of the status phase".
  // Checks: three structures are warned of, three of four.
  // Why the check is NOT redundant here: the card asks four or more.
  test.fails('publicObjective:build_defenses three structures are warned of', () => {
    const t = table({ docks: ['h1'], pds: { h1: 1, t1: 1 } });
    expectStanding(warningsOf(t, t.status), UNMET);
    expect(unmet(t)).toMatchObject({ objective: id, have: 3, need: 4 });
  });

  // The card's "Have ... structures", with the app's rule that a structure belongs to whoever controls its planet
  // (src/domain/replay/structures.ts).
  // Checks: two PDS on a planet another player controls are theirs and do not count.
  // Why the check is NOT redundant here: the card counts the player's own structures only.
  test.fails('publicObjective:build_defenses structures on a planet I do not control are not mine', () => {
    const t = table({ docks: ['h1'], pds: { h1: 1, t2: 2 }, planetControl: { h1: 'me', h2: 'me', t1: 'me', t2: 'enemy' } });
    expect(unmet(t)).toMatchObject({ objective: id, have: 2, need: 4 });
  });
});
