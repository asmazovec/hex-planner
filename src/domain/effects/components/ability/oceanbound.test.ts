import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './oceanbound';

describe('ability:oceanbound Oceanbound', () => {
  // "When your units begin coexisting on a planet: gain an ocean card and ready it."
  // Checks: the ability is a reminder of the invasion's block, where coexistence would begin.
  // Why the check is NOT redundant here: nothing is validated, because neither ocean cards nor coexistence are part
  // of the count (GameState has neither), so there is no number of ocean cards to keep under the planets.
  test('ability:oceanbound is a hint at the invasion: ocean cards are not counted', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'] });
    quote(pack, id, 'discard ocean cards until you do not');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
