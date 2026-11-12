import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './galactic_threat';

describe('ability:galactic_threat Galactic Threat', () => {
  // "You cannot vote on agendas"
  // Checks: the ability is a hint with no step.
  // Why nothing is validated: the plan holds no votes and no agenda outcome; a technology won by a right prediction is
  // entered as a gain (gaining, not researching: Propagation does not replace it).
  test('ability:galactic_threat is a hint with no step: the plan holds no votes', () => {
    const { pack } = bench({ faction: 'nekro' });
    quote(pack, id, 'You cannot vote on agendas');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
