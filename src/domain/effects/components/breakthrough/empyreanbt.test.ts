import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './empyreanbt';

describe('breakthrough:empyreanbt Void Tether', () => {
  // "you may place or move 1 of your Void Tether tokens onto a border that system shares with another system; other
  //  players do not treat those systems as adjacent to each other unless you allow it."
  // Checks: the breakthrough is a reminder at the activation.
  // Why nothing is validated here: Void Tether tokens are not tracked, and the adjacency they cut is that of other
  // players, on their routes; the Empyrean player's own routes are not changed.
  test('breakthrough:empyreanbt is a hint shown at the activation', () => {
    const { pack } = bench({ faction: 'empyrean', expansions: ['pok', 'te'] });
    quote(pack, id, 'other players do not treat those systems as adjacent to each other unless you allow it');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.todo('breakthrough:empyreanbt a rival\'s route across a tethered border is warned: the tokens on borders are not tracked');
});
