import { describe, expect, test } from 'vitest';
import type { DataPack, ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET, warningsOf } from '../kit';
import { id } from './research_outposts';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');

/** Planets of the real data: Wellon (cybernetic), Thibah (propulsion), Tar'mann (biotic) have a specialty, Saudor none. */
const addWorlds = (pack: DataPack) => {
  pack.tiles['x-worlds'] = { id: 'x-worlds', number: 'x-worlds', planetIds: ['wellon', 'thibah', 'tarmann', 'saudor'], kind: 'system', wormholes: [] };
};
const table = (controlled: string[]) => {
  const scoring = score();
  return {
    scoring, ...bench({
      faction: 'sol', entries: [scoring], edit: addWorlds,
      game: {
        map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'x-worlds', [FARTHER]: 'r-empty' },
        planetControl: Object.fromEntries(controlled.map(planet => [planet, 'me' as const])),
      },
    }),
  };
};

describe('publicObjective:research_outposts Found Research Outposts', () => {
  // "Control 3 planets that have technology specialties."
  // Checks: two planets with a specialty and two without: scoring is warned of.
  // Why the check is NOT redundant here: the requirement counts planets with a specialty only (61.5).
  test('publicObjective:research_outposts scored with two planets with a specialty is warned of', () => {
    const t = table(['wellon', 'thibah', 'saudor', 't1']);
    quote(t.pack, id, 'Control 3 planets that have technology specialties.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Rulings: "The number of technology specialties a planet has is irrelevant, if it has at least one."
  // Checks: three planets with a specialty each: the requirement is met, nothing is warned of.
  // Why the check is redundant here: the requirement holds at the Score Objectives step (81.1).
  test('publicObjective:research_outposts scored with three planets with a specialty is not warned of', () => {
    const t = table(['wellon', 'thibah', 'tarmann']);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:research_outposts is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
