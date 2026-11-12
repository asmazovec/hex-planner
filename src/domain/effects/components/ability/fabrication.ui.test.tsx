import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, quote } from '../kit';
import { id } from './fabrication';

uiBench();

// "... or purge 1 of your relic fragments to gain 1 command token."
// Checks: in the editor of a component action I choose Fabrication, then the command token, then the pool; the
// choices are written to the entry as the play reads them.
// Why the check is redundant here: the ability asks what the fragments buy and where the token goes; the replay reads
// the answers from the entry.
test('ability:fabrication the editor asks for the token and its pool and writes both', async () => {
  const entry = componentAction('');
  const table = bench({ faction: 'naaz', expansions: ['pok'], entries: [entry] });
  quote(table.pack, id, 'purge 1 of your relic fragments to gain 1 command token');
  const live = showTurn(table, entry);
  await play('Fabrication');
  await choose('Command token');
  await choose('Fleet pool');
  expect(live.entry().componentId).toBe(id);
  expect(live.entry().choices).toEqual({ gain: 'token', pool: 'fleet' });
});
