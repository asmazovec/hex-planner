import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './favor';

describe('promissory:favor Political Favor', () => {
  // "When an agenda is revealed: Remove 1 token from the Xxcha player's strategy pool and return it to their
  //  reinforcements. Then, discard the revealed agenda and reveal 1 agenda from the top of the deck."
  // Checks: the note is a reminder with no step and lifts nothing.
  // Why nothing is validated: agendas and votes are not planned, and the token it removes is the Xxcha player's,
  // another player than the one who plays the note; a component is asked of the owner of the entry only.
  test('promissory:favor is a hint with no step', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'Remove 1 token from the Xxcha player\'s strategy pool');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
