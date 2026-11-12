import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './subatomic';

describe('technology:subatomic Subatomic Splicer', () => {
  // "When one of your ships is destroyed, you may produce a ship of the same type at a space dock in your home system."
  // Checks: the technology is a reminder in the block of combat.
  // Why nothing is validated: the production happens at the moment of a loss, outside the production step of an
  // action, and the plan has no entry for it.
  test('technology:subatomic is a reminder of combat', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['te'] });
    quote(pack, id, 'you may produce a ship of the same type at a space dock in your home system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  test.todo('technology:subatomic a ship lost is produced again, paid for, at a dock of the home system: the plan has no production outside the production step');
});
