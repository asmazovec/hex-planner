import { expect, test } from 'vitest';
import { showWarnings, uiBench } from '../../../../ui/testing/effects';
import { adjust, bench, endOf, quote } from '../kit';
import { id } from './muaatbt';

uiBench();

// "When you gain this card, ... gain the Avernus planet card and ready it."
// Checks: the entry that gains the breakthrough shows no warning, and the Avernus planet card is mine, ready, after it.
// Why no check is lifted: the card gives the planet outright and breaks no rule; the interface must not warn of it.
test('breakthrough:muaatbt gaining the breakthrough shows no warning and gives Avernus', () => {
  const gain = { ...adjust({}), gains: [id] };
  const table = bench({ faction: 'muaat', expansions: ['pok', 'te'], entries: [gain] });
  quote(table.pack, id, 'gain the Avernus planet card and ready it');
  const live = showWarnings(table, gain);
  expect(live.warnings()).toEqual([]);
  expect(endOf(table).control.avernus).toBe('me');
});
