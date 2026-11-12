import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './mahact_mech';

describe('mech:mahact_mech Starlancer', () => {
  // "After a player whose command token is in your fleet pool activates this system, you may spend their token from
  //  your fleet pool to end their turn; they gain that token."
  // Checks: the mech is a reminder at the activation.
  // Why nothing is validated here: it ends another player's turn in that player's turn, and whose tokens are in the
  // Mahact fleet pool is not tracked.
  test('mech:mahact_mech is a hint shown at the activation', () => {
    const { pack } = bench({ faction: 'mahact', expansions: ['pok'] });
    quote(pack, id, 'you may spend their token from your fleet pool to end their turn; they gain that token');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });
});
