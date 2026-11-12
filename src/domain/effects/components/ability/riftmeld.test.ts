import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './riftmeld';

describe('ability:riftmeld Riftmeld', () => {
  // "When you research a unit upgrade technology: You may return 1 captured unit of that type to ignore all of the
  //  technology's prerequisites."
  // Checks: the ability is a reminder of the research, which a strategy card resolves.
  // Why nothing is validated here: the replay does not check prerequisites yet, and it keeps no captured units.
  test('ability:riftmeld is a hint of the strategy card', () => {
    const { pack } = bench({ faction: 'cabal', expansions: ['pok'] });
    quote(pack, id, 'to ignore all of the technology\'s prerequisites');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
  });

  test.todo('ability:riftmeld lifts the prerequisites of a unit upgrade: the replay checks no prerequisites and keeps no captured units');
});
