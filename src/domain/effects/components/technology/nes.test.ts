import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nes';

describe('technology:nes Non-Euclidean Shielding', () => {
  // "When 1 of your units uses SUSTAIN DAMAGE, cancel 2 hits instead of 1."
  // Checks: the technology is a reminder of the combat step and changes nothing the plan counts.
  // Why nothing is validated here: hits and their cancelling are not replayed; the player enters the losses by hand.
  test('technology:nes is a hint of the combat', () => {
    const { pack } = bench({ faction: 'letnev' });
    quote(pack, id, 'cancel 2 hits instead of 1');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
  });
});
