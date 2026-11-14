import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, quote, type Bench } from '../kit';
import { id } from './plowshares';
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

// "For: Each player destroys half of their infantry on each planet they control, rounded up. ... Against: Each player
//  places 1 infantry from their reinforcements on each planet they control."
// Checks: in the editor of the agenda entry the player chooses the outcome that received the most votes; the entry
// keeps it (`choices.outcome`), which the replay then plays.
// Why: a directive's outcome is one of two, and the plan cannot count it without knowing which.
test('agenda:plowshares the outcome is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[entry]] });
  quote(table.pack, id, 'Each player destroys half of their infantry on each planet they control, rounded up.');
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Against' }));
  expect(read().choices).toMatchObject({ outcome: 'against' });
  await userEvent.click(screen.getByRole('button', { name: 'For' }));
  expect(read().choices).toMatchObject({ outcome: 'for' });
});
