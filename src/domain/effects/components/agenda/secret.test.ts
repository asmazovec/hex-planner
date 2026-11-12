import { describe, expect, test } from 'vitest';
import { componentsOf } from '../../../components';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './secret';

describe('agenda:secret Archived Secret', () => {
  // "The elected player draws 1 secret objective."
  // Checks: a hint with no step and no waiver; the directive leaves nothing in play once resolved.
  // Why the check is NOT redundant here: there is no check to lift. The election is a vote, and the objective drawn
  // is entered as any card drawn, in the entry's gains.
  test('agenda:secret is a reminder; the objective drawn is entered as a gain', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'The elected player draws 1 secret objective.');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).waive).toBeUndefined();
    const objective = componentsOf(table.pack).find(c => c.kind === 'secretObjective')!.id;
    const drawn = bench({ faction: 'sol', entries: [{ ...adjust({}, 'agenda'), gains: [id, objective] }] });
    expect(endOf(drawn).holdings.secrets).toEqual([objective]);
    expect(endOf(drawn).laws ?? []).not.toContain(id);
  });
});
