import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './pfa';

describe('technology:pfa Pre-Fab Arcologies', () => {
  // "After you explore a planet, ready that planet."
  // Checks: the technology is a reminder with no step and lifts nothing.
  // Why nothing is validated here: exploration is not planned, so the moment the planet is readied does not exist in
  // the plan; `planetExhausted` is not lifted, as a planet spent before is not readied by an exploration the plan
  // does not know of.
  test('technology:pfa is a hint with no step: exploration is not planned', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'After you explore a planet, ready that planet.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
