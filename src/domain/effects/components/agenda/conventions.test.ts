import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './conventions';

describe('agenda:conventions Conventions of War', () => {
  // "For: Players cannot use BOMBARDMENT against units that are on cultural planets."
  // Checks: a hint in the block of the landing, with no waiver.
  // Why the check is NOT redundant here: there is no check to lift or to add. Bombardment is a roll of dice in the
  // invasion (8), and the plan simulates none: the player enters the ground forces lost.
  test('agenda:conventions is a reminder in the block of the landing', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'Players cannot use BOMBARDMENT against units that are on cultural planets.');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
    expect(effect(table.pack, id).waive).toBeUndefined();
  });

  test.todo('agenda:conventions "Against" discards the action cards of those who voted against: the plan does not count votes');
});
