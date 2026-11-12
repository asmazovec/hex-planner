import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ralnelcommander';

describe('leader:ralnelcommander Watchful Ojz', () => {
  // "When you declare a retreat: Immediately retreat up to 2 of your ships from the active system to an adjacent system
  //  that does not contain another player's ships."
  // Checks: the commander is a reminder in the block of combat.
  // Why nothing is validated: a retreat is declared within a combat, which the plan does not simulate; the ships that
  // leave and the command token placed with them are not an entry of the plan.
  test('leader:ralnelcommander is a reminder of combat', () => {
    const { pack } = bench({ faction: 'ralnel', expansions: ['pok', 'te'] });
    quote(pack, id, 'When you declare a retreat: Immediately retreat up to 2 of your ships');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
