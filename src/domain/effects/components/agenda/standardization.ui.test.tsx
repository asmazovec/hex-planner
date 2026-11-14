import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, type Bench, quote } from '../kit';
import { id } from './standardization';

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
      <AdjustmentEditor view={kernelViewOf(table.game, table.pack)}
        game={table.game} pack={table.pack} entry={shown} warnings={[]} picking={false}
        onPickSystem={nothing} onOpenHex={nothing} onDone={nothing} onRemove={nothing}
        onUpdate={patch => setShown(now => ({ ...now, ...patch }))}
      />
    );
  }
  useGame.setState({ game: table.game });
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
