import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET } from '../kit';
import { id } from './corner';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const CONTROLLED = ['wellon', 'thibah', 'tarmann', 'vefutii'];

// "Control 4 planets that each have the same planet trait."
// Checks: the status entry scores Corner the Market with four planets of mixed traits controlled: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test('publicObjective:corner scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
    edit: pack => { pack.tiles['x-worlds'] = { id: 'x-worlds', number: 'x-worlds', planetIds: ['wellon','thibah','tarmann','vefutii'], kind: 'system', wormholes: [] }; },
    game: {
      map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'x-worlds', [FARTHER]: 'r-empty' },
      planetControl: Object.fromEntries(CONTROLLED.map(planet => [planet, 'me' as const])),
    },
  });
  quote(table.pack, id, 'Control 4 planets that each have the same planet trait.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
