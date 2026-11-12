import { describe, expect, test } from 'vitest';
import type { EntryBody } from '../../../types';
import { bench, effect, endOf, planned, quote } from '../kit';
import { id } from './warrant';

describe('agenda:warrant Search Warrant', () => {
  // "The elected player gains this card and draws 2 secret objectives."
  // Checks: the two secrets drawn are entered among the gains of the agenda entry, and the elected player holds them.
  // Why nothing is validated: the secrets are drawn at random, and the plan already counts what any entry gains;
  // playing them revealed changes nothing the plan counts.
  test('agenda:warrant the secrets drawn are entered among the gains of the agenda entry', () => {
    const agenda = planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id, 'secretObjective:ans', 'secretObjective:ctr'] });
    const table = bench({ faction: 'sol', expansions: ['pok'], entries: [agenda] });
    quote(table.pack, id, 'draws 2 secret objectives');
    expect(endOf(table).holdings.secrets).toEqual(expect.arrayContaining(['secretObjective:ans', 'secretObjective:ctr']));
  });

  // Checks: the card is a hint, with no waiver.
  test('agenda:warrant is a hint', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
