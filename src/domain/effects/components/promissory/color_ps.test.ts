import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './color_ps';

describe('promissory:<color>_ps Political Secret', () => {
  // "When an agenda is revealed: The <color> player cannot vote, play action cards, or use faction abilities until
  //  after that agenda has been resolved."
  // Checks: the note is a reminder with no step, and lifts nothing.
  // Why nothing is validated: it acts in the agenda phase, which has no step in the plan; votes are not counted.
  test('promissory:<color>_ps is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'cannot vote, play action cards, or use faction abilities');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
