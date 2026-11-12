import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './xxchacommander';

describe('leader:xxchacommander Elder Qanoj', () => {
  // "When you vote: Each planet you exhaust to cast votes provides 1 additional vote."
  // Checks: the commander is a reminder with no step and lifts nothing.
  // Why nothing is validated: votes are not planned; a planet exhausted to vote is outside the count.
  test('leader:xxchacommander is a hint with no step', () => {
    const { pack } = bench({ faction: 'xxcha', expansions: ['pok'] });
    quote(pack, id, 'Each planet you exhaust to cast votes provides 1 additional vote');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
