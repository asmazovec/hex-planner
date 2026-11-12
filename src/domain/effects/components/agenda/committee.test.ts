import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './committee';

describe('agenda:committee Committee Formation', () => {
  // "Before players vote on an agenda that requires a player to be elected, the owner of this card may discard this
  //  card to choose a player to be elected. Players do not vote on that agenda."
  // Checks: a hint with no step and no waiver.
  // Why the check is NOT redundant here: there is no check to lift. It speaks of votes and elections, which the plan
  // does not count.
  test('agenda:committee is a reminder only', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'may discard this card to choose a player to be elected');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toBeUndefined();
    expect(effect(table.pack, id).waive).toBeUndefined();
  });
});
