import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './mentakcommander';

describe('leader:mentakcommander S\'ula Mentarion', () => {
  // "After you win a space combat"
  // Checks: the component is a hint shown in the block of the combat step, and lifts nothing.
  // Why nothing is validated here: the plan does not decide who wins a space combat; the note given is entered as a gain by hand.
  test('leader:mentakcommander is a hint at the combat step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak', expansions: ['pok'] });
    quote(pack, id, "After you win a space combat");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
