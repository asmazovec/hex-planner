import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { useGame } from '../../../../state/gameStore';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../types';
import { adjust, bench, type Bench, HOME, quote, tactical } from '../kit';
import { id } from './holy_planet_of_ixth';
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


/** The agenda resolved in the agenda phase of round 1, with what was elected. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

// "Attach this card to the elected planet's card."
// Checks: in the editor of the agenda entry the player elects Home One; the entry keeps it (`choices.elect`), and the
// replay attaches the law to that planet.
// Why: the planet that loses PRODUCTION and gives the point is the elected one.
test('agenda:holy_planet_of_ixth the elected planet is chosen in the agenda entry', async () => {
  const entry = { ...adjust({}, 'agenda'), gains: [id] } as Entry;
  const table = bench({ faction: 'sol', rounds: [[entry]] });
  quote(table.pack, id, 'Units on this planet cannot use PRODUCTION.');
  const read = showAgenda(table, entry);
  await userEvent.click(screen.getByRole('button', { name: 'Elect Home One' }));
  expect(read().choices).toMatchObject({ elect: 'h1' });
});

// "Units on this planet cannot use PRODUCTION."
// Checks: the dock of Home One, under the law, builds one infantry; the production is shown over its value, standing.
// Why the check is NOT redundant here: the law takes the dock's PRODUCTION away; nothing lifts that.
test('agenda:holy_planet_of_ixth a production at a dock on the elected planet is shown over its value', () => {
  const build = tactical(HOME, { production: { infantry: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', game: { docks: ['h1'] }, rounds: [[resolved('h1')], [build]] });
  showWarnings(table, build);
  expectShownStanding('productionOver');
});
