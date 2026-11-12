import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naazbt';

describe('breakthrough:naazbt Absolute Synergy', () => {
  // "When you have 4 mechs in the same system, you may return 3 of those mechs to your reinforcements to flip this card
  //  and place it on top of your mech card."
  // Checks: the breakthrough is a reminder with no step and lifts nothing.
  // Why nothing is validated here: the plan holds a breakthrough as held or exhausted, not flipped, and an entry that
  // uses a component names no system to return the mechs from; they are removed by hand.
  test('breakthrough:naazbt is a hint with no step', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok', 'te'] });
    quote(pack, id, 'return 3 of those mechs to your reinforcements to flip this card');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('breakthrough:naazbt 3 of 4 mechs in one system return to the reinforcements and the card flips: the plan has no flipped breakthrough and no system for a used component');
});
