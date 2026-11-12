import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, type Bench, quote } from '../kit';
import { id } from './wormhole_research';

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
      <AdjustmentEditor
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


// "For: Each player who has 1 or more ships in a system that contains a wormhole may research 1 technology. Then,
//  destroy all ships in systems that contain an alpha or beta wormhole."
// Checks: in the editor of the agenda entry the player chooses the outcome; the entry keeps it (`choices.outcome`).
// Why: the plan destroys the ships only when the "For" outcome was resolved.
test('agenda:wormhole_research the outcome is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[entry]] });
  quote(table.pack, id, 'Then, destroy all ships in systems that contain an alpha or beta wormhole.');
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'For' }));
  expect(read().choices).toMatchObject({ outcome: 'for' });
});
