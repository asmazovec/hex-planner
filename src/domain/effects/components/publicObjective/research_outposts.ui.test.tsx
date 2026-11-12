import { test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody, ExtensionCode } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, planned, quote, TARGET } from '../kit';
import { id } from './research_outposts';

uiBench();

/** Scoring an objective whose requirement is not met: a new code made by the status step (pass 2). */
const CODE = 'objectiveUnmet' as ExtensionCode;
const CONTROLLED = ['wellon', 'thibah', 'saudor'];

// "Control 3 planets that have technology specialties."
// Checks: the status entry scores Found Research Outposts with two planets with a specialty controlled: the warning is on the screen, standing.
// Why the check is NOT redundant here: the objective is its own requirement (61.5, 61.10); nothing lifts it.
test.fails('publicObjective:research_outposts scored without its requirement shows the warning, standing', () => {
  const scoring: Entry = planned({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: [id] } as EntryBody, 'status');
  const table = bench({
    faction: 'sol', entries: [scoring],
    edit: pack => { pack.tiles['x-worlds'] = { id: 'x-worlds', number: 'x-worlds', planetIds: ['wellon','thibah','saudor'], kind: 'system', wormholes: [] }; },
    game: {
      map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'x-worlds', [FARTHER]: 'r-empty' },
      planetControl: Object.fromEntries(CONTROLLED.map(planet => [planet, 'me' as const])),
    },
  });
  quote(table.pack, id, 'Control 3 planets that have technology specialties.');
  showWarnings(table, scoring);
  expectShownStanding(CODE);
});
