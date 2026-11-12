import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './hacancommander';

describe('leader:hacancommander Gila the Silvertongue', () => {
  // "When you cast votes: You may spend any number of trade goods: cast 2 additional votes for each trade good spent."
  // Checks: the commander is a hint with no step of its own.
  // Why nothing is validated: votes are cast in the agenda phase, which the plan does not replay; trade goods spent on
  // votes are entered by hand, and no step of a tactical action or of the round is about votes.
  test('leader:hacancommander is a hint: the plan counts no votes', () => {
    const { pack } = bench({ faction: 'hacan', expansions: ['pok'] });
    quote(pack, id, 'cast 2 additional votes for each trade good spent');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
