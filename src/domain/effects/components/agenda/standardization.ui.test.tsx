import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, type Bench, quote } from '../kit';
import { id } from './standardization';
import { turnProps } from '../../../../ui/testing/turnProps';
import { seedGame } from '../../../../testing/store';

uiBench();

type Agenda = Extract<Entry, { type: 'adjustment' }> & { choices?: Record<string, string> };

/** The editor of the agenda entry, kept alive: every change of the entry stays, and the test reads it back. */
function showAgenda(table: Bench, entry: Entry): () => Agenda {
  let current = entry as Agenda;
  function Host() {
    const [shown, setShown] = useState(entry as Agenda);
    current = shown;
    const nothing = () => undefined;
    return (
      <AdjustmentEditor {...turnProps(kernelViewOf(table.game, table.pack), table.pack, shown, patch => setShown(now => ({ ...now, ...patch }) as Agenda))} view={kernelViewOf(table.game, table.pack)} pack={table.pack} warnings={[]} picking={false} onPickSystem={nothing} onOpenHex={nothing} onDone={nothing} onRemove={nothing}/>
    );
  }
  seedGame(table.game);
  render(<Host />);
  return () => current;
}


// "The elected player place command tokens from their reinforcements"
// Checks: in the editor of the agenda entry the player elects themselves; the entry keeps it (`choices.elect` is `me`).
// Why: the command sheet that changes is the elected player's only.
test('agenda:standardization the elected player is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', expansions: ['pok'], rounds: [[entry]] });
  quote(table.pack, id, 'The elected player place command tokens from their reinforcements');
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Elect The Federation of Sol' }));
  expect(read().choices).toMatchObject({ elect: 'me' });
});
