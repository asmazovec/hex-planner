import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './ds';

describe('technology:ds Dimensional Splicer', () => {
  // "At the start of space combat in a system that contains a wormhole and 1 or more of your ships, you may produce 1
  //  hit and assign it to 1 of your opponent's ships."
  // Checks: the technology is a reminder in the block of the battle.
  // Why nothing is validated: the hit belongs to a space combat, which the plan does not simulate; the losses of a
  // battle are entered by hand.
  test('technology:ds is a hint of the combat', () => {
    const { pack } = bench({ faction: 'ghost' });
    quote(pack, id, 'you may produce 1 hit and assign it to 1 of your opponent\'s ships');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
