import { expect, test } from 'vitest';
import { expectNotShown, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, quote } from '../kit';
import { id } from './quantumcore';

uiBench();

// "When you gain this card, gain your breakthrough."
// Checks: the entry that gains the relic shows no warning of a component not held or an unknown breakthrough.
// Why the check is redundant here: there is no check; the relic gives the breakthrough on being gained.
test('relic:quantumcore an entry that gains the relic shows no warning', () => {
  const entry: Entry = { ...adjust({}), gains: [id] };
  const table = bench({ faction: 'sol', expansions: ['te'], entries: [entry] });
  quote(table.pack, id, 'gain your breakthrough');
  const live = showWarnings(table, entry);
  expect(live.warnings()).toEqual([]);
  expectNotShown('componentNotHeld');
});
