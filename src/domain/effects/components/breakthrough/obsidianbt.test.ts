import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './obsidianbt';

describe('breakthrough:obsidianbt The Reaping', () => {
  // "Place 1 trade good from the supply onto this card each time you win a combat against a puppeted player."
  // Checks: the breakthrough is a reminder of the combat and of the status phase, and lifts no check.
  // Why nothing is validated: the plan does not count who wins a combat, and the puppeted players are those of plot
  // cards, which are not tracked; the trade goods gained are entered by the player.
  test('breakthrough:obsidianbt is a reminder of the combat and the status phase and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'gain all trade goods on this card, then gain an equal number of trade goods from the supply');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'status']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('breakthrough:obsidianbt the trade goods of the card are doubled in the status phase: combats won and puppeted players are not counted');
});
