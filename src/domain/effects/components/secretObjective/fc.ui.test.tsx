import { test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, FARTHER, quote, statusTokens } from '../kit';
import { id } from './fc';

uiBench();

// "Be neighbors with all other players."
// Checks: the status entry scores the secret while the only rival is four systems away; the warning of an unmet
// requirement stands on the screen.
// Why the check is NOT redundant here: LRR 61.5 lets a player score an objective whose requirement they fulfil.
test('secretObjective:fc scored with a rival who is no neighbour is shown warned of', () => {
  const entry = { ...statusTokens(0, 0, 0), scored: [id] } as Entry;
  const table = bench({
    faction: 'sol', expansions: ['pok'], start: { secrets: [id] }, entries: [entry],
    game: { opponents: [{ id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], enemyUnits: { [FARTHER]: { o1: { carrier: 1 } } } },
    edit: pack => {
      pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
    },
  });
  quote(table.pack, id, 'Be neighbors with all other players.');
  showWarnings(table, entry);
  expectShownStanding('objectiveUnmet' as AnyWarningCode);
});
