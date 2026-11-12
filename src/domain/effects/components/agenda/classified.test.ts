import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './classified';

describe('agenda:classified Classified Document Leaks', () => {
  // "The elected secret objective becomes a public objective - place it near the other public objectives in the common
  //  play area."
  // Checks: a hint with no step and no waiver.
  // Why the check is NOT redundant here: there is no check to lift. The plan does not check which objectives a player
  // may score; the points and the objectives scored are entered by the player.
  test('agenda:classified is a reminder only', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'The elected secret objective becomes a public objective');
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toBeUndefined();
    expect(effect(table.pack, id).waive).toBeUndefined();
  });
});
