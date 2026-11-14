import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './coalescence';

describe('ability:coalescence Coalescence', () => {
  // "... your units must participate in combat during "Space Combat" or "Ground Combat" steps."
  // Checks: the ability is a reminder of the battle in space and of the invasion.
  // Why nothing is validated here: the plan simulates no combat; who fights whom is the player's own record of losses.
  test('ability:coalescence is a hint of the combat and of the invasion', () => {
    const { pack } = bench({ faction: 'titans', expansions: ['pok'] });
    quote(pack, id, 'your units must participate in combat');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });
});
