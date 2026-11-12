import { describe, expect, test } from 'vitest';
import type { DataPack, Entry, EntryBody, ExtensionCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET, warningsOf } from '../kit';
import { id } from './corner';

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const score = (): Entry => planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');

/** Four planets of the real data in one system: three industrial, one hazardous. */
const addWorlds = (pack: DataPack) => {
  pack.tiles['x-worlds'] = { id: 'x-worlds', number: 'x-worlds', planetIds: ['wellon', 'thibah', 'tarmann', 'vefutii', 'saudor'], kind: 'system', wormholes: [] };
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

describe('publicObjective:corner Corner the Market', () => {
  // "Control 4 planets that each have the same planet trait."
  // Checks: four planets controlled, but only three of them industrial (Vefut II is hazardous): scoring is warned of.
  // Why the check is NOT redundant here: the objective is its own requirement (61.5): it is met only by four planets of
  // one trait, so scoring it without them is a breach the plan should show.
  test('publicObjective:corner scored with four planets of mixed traits is warned of', () => {
    const t = table(['wellon', 'thibah', 'tarmann', 'vefutii']);
    quote(t.pack, id, 'Control 4 planets that each have the same planet trait.');
    expectStanding(warningsOf(t, t.scoring), CODE);
  });

  // Checks: four industrial planets controlled: the requirement is met, nothing is warned of.
  // Why the check is redundant here: the requirement holds on the board at the Score Objectives step (81.1).
  test('publicObjective:corner scored with four industrial planets is not warned of', () => {
    const t = table(['wellon', 'thibah', 'tarmann', 'saudor']);
    expectNone(warningsOf(t, t.scoring), CODE);
  });

  // Checks: the objective is played by the status entry that scores it, which checks its requirement.
  test('publicObjective:corner is a play effect of the status entry', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
