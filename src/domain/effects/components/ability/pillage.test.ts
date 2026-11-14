import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './pillage';

describe('ability:pillage Pillage', () => {
  // "If they have 3 or more trade goods, you may take 1 of their trade goods or commodities"
  // Checks: the component is a hint shown in the block of the transaction step, and lifts nothing.
  // Why nothing is validated here: whether a neighbour has 3 trade goods after their transaction, and whether the Mentak take one, is another player's state and a choice made at the table; a trade good taken is entered as a gain of the entry.
  test('ability:pillage is a hint at the transaction step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak' });
    quote(pack, id, "If they have 3 or more trade goods, you may take 1 of their trade goods or commodities");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['transaction']);
  });
});
