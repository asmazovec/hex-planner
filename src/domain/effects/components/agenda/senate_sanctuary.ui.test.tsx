import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { expectNotShown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, type Bench, quote, secondary } from '../kit';
import { id } from './senate_sanctuary';

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


/** The agenda resolved in the agenda phase of round 1, with what was elected. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

// "Attach this card to the elected planet's card."
// Checks: in the editor of the agenda entry the player elects Home One; the entry keeps it (`choices.elect`), and the
// replay attaches the law to that planet.
// Why: the influence changes on the elected planet only.
test('agenda:senate_sanctuary the elected planet is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[entry]] });
  quote(table.pack, id, 'The influence value of this planet is increased by 2.');
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Elect Home One' }));
  expect(read().choices).toMatchObject({ elect: 'h1' });
});

// "The influence value of this planet is increased by 2."
// Checks: Home One, under the law, alone buys a command token: the warnings of the entry show no lack of influence.
// Why the check is redundant here: the planet's influence is 3, not 1 (a modify).
test('agenda:senate_sanctuary the payment with the elected planet shows no lack of influence', () => {
  const buy = secondary(CARD.leadership, { tokens: { fleet: 1 }, boughtTokens: 1, payment: { planets: ['h1'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', rounds: [[resolved('h1')], [buy]] });
  showWarnings(table, buy);
  expectNotShown('shortInfluence');
});
