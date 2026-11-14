import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../../../ui/testing/view';
import { expect, test } from 'vitest';
import { expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import type { Entry, EntryBody } from '../../../types';
import { bench, HOME, planned, quote } from '../kit';
import { id } from './cladenstine';

uiBench();

const resolved = (choices: Record<string, string | number>): Entry =>
  planned({ type: 'adjustment', label: '', delta: {}, choices } as EntryBody, 'agenda', { gains: [id] });
const table = (agenda: Entry) => bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 3 } }, entries: [agenda] });
const nothing = () => undefined;

// "For: Each player removes 2 command tokens from their command sheet ... Against: Each player removes 1 command
//  token from their fleet pool"
// Checks: the editor of the resolved agenda offers its two outcomes to choose from, so the player does not enter the
// tokens by hand.
// Why the check is redundant here: nothing is lifted; the outcome changes the command sheet the plan counts.
test('agenda:cladenstine the agenda editor offers the outcomes For and Against', () => {
  const agenda = resolved({});
  const t = table(agenda);
  quote(t.pack, id, 'Each player removes 1 command token from their fleet pool');
  render(
    <AdjustmentEditor view={kernelViewOf(t.game, t.pack)}
      game={t.game} pack={t.pack} entry={agenda as Extract<Entry, { type: 'adjustment' }>} warnings={[]} picking={false}
      onPickSystem={nothing} onOpenHex={nothing} onUpdate={nothing} onDone={nothing} onRemove={nothing}
    />,
  );
  expect(screen.getByRole('button', { name: 'For' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Against' })).toBeEnabled();
});

// LRR 37.3: ships beyond a lowered fleet pool are removed.
// Checks: after "Against" the three cruisers at home are beyond the pool of 2, and the warning is on the screen, standing.
// Why the check is NOT redundant here: the agenda lowers the limit and lets nothing stay beyond it.
test('agenda:cladenstine against shows the ships beyond the lowered fleet pool, standing', () => {
  const agenda = resolved({ outcome: 'against' });
  showWarnings(table(agenda), agenda);
  expectShownStanding('fleetPool');
});
