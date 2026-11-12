import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './l4';

describe('technology:l4 L4 Disruptors', () => {
  // "During an invasion, units cannot use SPACE CANNON against your units."
  // Checks: the technology is a reminder of the invasion step and changes nothing the plan counts.
  // Why nothing is validated here: Space Cannon Defense is a roll of dice the plan does not make.
  test('technology:l4 is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'letnev' });
    quote(pack, id, 'During an invasion, units cannot use SPACE CANNON against your units.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
