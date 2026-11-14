import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { expectShownStanding, land, showTactical, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, type Bench, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './demilitarized_zone';
import { turnProps } from '../../../../ui/testing/turnProps';

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
  useGame.setState({ game: table.game });
  render(<Host />);
  return () => current;
}


/** Declared in pass 2 as `src/domain/rules/codes/planetClosed.ts`; named by its string until then. */
const CODE = 'planetClosed' as AnyWarningCode;

/** The agenda resolved in the agenda phase of round 1, with what was elected. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

// "Attach this card to the elected planet's card."
// Checks: in the editor of the agenda entry the player elects Home One; the entry keeps it (`choices.elect`), and the
// replay attaches the law to that planet.
// Why: the planet the law closes is the elected one.
test('agenda:demilitarized_zone the elected planet is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[entry]] });
  quote(table.pack, id, "Player's units cannot land, be produced, or be placed on this planet.");
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Elect Home One' }));
  expect(read().choices).toMatchObject({ elect: 'h1' });
});

// "Player's units cannot land, be produced, or be placed on this planet."
// Checks: in the tactical editor the player lands an infantry on Target One, which the law closes; the landing is
// taken (the plan forbids nothing) and its warning stands in the landing block.
// Why the check is NOT redundant here: the law forbids the landing for every player; nothing lifts it.
test('agenda:demilitarized_zone a landing on the elected planet is taken and warned of', async () => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }] });
  const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[resolved('t1')], [move]] });
  const live = showTactical(table, move);
  await land('Infantry', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 } }]);
  expectShownStanding(CODE);
});
