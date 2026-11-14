import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './obsidiancommander';

describe('leader:obsidiancommander Aroz Hollow', () => {
  // "Apply +1 to the result of each of your units' combat rolls in The Fracture."
  // Checks: the commander is a reminder of the combat and lifts no check.
  // Why nothing is validated: the plan rolls no dice; the outcome of a combat is entered by the player.
  test('leader:obsidiancommander is a reminder of the combat and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'Apply +1 to the result of each of your units\' combat rolls in The Fracture.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
