import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './future_sight';

describe('ability:future_sight Future Sight', () => {
  // "During the Agenda phase, after an outcome that you voted for or predicted is resolved: Gain 1 trade good"
  // Checks: the ability is a reminder with no step and lifts nothing.
  // Why nothing is validated here: the agenda phase, its votes and outcomes are not planned; the trade good is
  // entered by hand.
  test('ability:future_sight is a hint with no step: the agenda phase is not planned', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'after an outcome that you voted for or predicted is resolved: Gain 1 trade good');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
