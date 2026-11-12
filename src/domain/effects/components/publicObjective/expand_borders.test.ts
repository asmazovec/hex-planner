import { describe, expect, test } from 'vitest';
import type { DataPack, Entry, EntryBody, ExtensionCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET, warningsOf } from '../kit';
import { id } from './expand_borders';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');

/** Four more planets of the real data in one system beside the target's two. */
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

describe('publicObjective:expand_borders Expand Borders', () => {
  // "Control 6 planets in non-home systems."
  // Checks: six planets controlled, but two of them are the home planets: four outside home, so scoring is warned of.
  // Why the check is NOT redundant here: the requirement counts planets outside home systems only (61.5).
  test.fails('publicObjective:expand_borders scored with the home planets among six is warned of', () => {
    const t = table(['h1', 'h2', 't1', 'wellon', 'thibah', 'tarmann']);
    quote(t.pack, id, 'Control 6 planets in non-home systems.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: six planets outside the home system controlled: the requirement is met, nothing is warned of.
  // Why the check is redundant here: the requirement holds at the Score Objectives step (81.1).
  test('publicObjective:expand_borders scored with six planets outside home is not warned of', () => {
    const t = table(['t1', 't2', 'wellon', 'thibah', 'tarmann', 'saudor']);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test.fails('publicObjective:expand_borders is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
