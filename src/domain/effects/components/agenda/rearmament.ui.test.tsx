import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';
import { AdjustmentEditor } from '../../../../ui/plan/editors/AdjustmentEditor';
import type { Entry, EntryBody } from '../../../types';
import { bench, planned, quote } from '../kit';
import { id } from './rearmament';

uiBench();

const nothing = () => undefined;

// "For: Each player places 1 mech from their reinforcements on a planet they control in their home system.
//  Against: Each player replaces each of their mechs with 1 infantry"
// Checks: the editor of the resolved agenda offers its two outcomes, so the board changes without the big hex.
// Why the check is redundant here: nothing is lifted; the outcome places and replaces units the plan counts.
test('agenda:rearmament the agenda editor offers the outcomes For and Against', () => {
  const agenda = planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id] });
  const t = bench({ faction: 'sol', expansions: ['pok'], entries: [agenda] });
  quote(t.pack, id, 'on a planet they control in their home system');
  render(
    <AdjustmentEditor
      game={t.game} pack={t.pack} entry={agenda as Extract<Entry, { type: 'adjustment' }>} warnings={[]} picking={false}
      onPickSystem={nothing} onOpenHex={nothing} onUpdate={nothing} onDone={nothing} onRemove={nothing}
    />,
  );
  expect(screen.getByRole('button', { name: 'For' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Against' })).toBeEnabled();
});
