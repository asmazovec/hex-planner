import { describe, expect, test } from 'vitest';
import type { EntryBody } from '../../../types';
import { bench, effect, endOf, planned, quote } from '../kit';
import { id } from './minister_antiquities';

describe('agenda:minister_antiquities Minister of Antiquities', () => {
  // "The elected player gains 1 relic."
  // Checks: the relic drawn is entered among the gains of the agenda entry, and the elected player holds it.
  // Why nothing is validated: which relic is drawn is chance; the plan already counts a relic gained with any entry,
  // so the card adds nothing to count and nothing to check.
  test('agenda:minister_antiquities the relic drawn is entered among the gains of the agenda entry', () => {
    const agenda = planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id, 'relic:dynamiscore'] });
    const table = bench({ faction: 'sol', expansions: ['pok'], entries: [agenda] });
    quote(table.pack, id, 'The elected player gains 1 relic.');
    expect(endOf(table).holdings.relics).toContain('relic:dynamiscore');
  });

  // Checks: the card is a hint, with no step and no waiver.
  test('agenda:minister_antiquities is a hint', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
