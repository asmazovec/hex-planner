import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nekrobt';

describe('breakthrough:nekrobt Valefar Assimilator Z', () => {
  // "Your flagship gains the text abilities of that faction's flagship in addition to its own."
  // Checks: the breakthrough is a hint with no step.
  // Why nothing is validated: the plan keeps no assimilator token, and a flagship's printed ability is not a component
  // of the catalogue, so nothing it copies can be counted.
  test('breakthrough:nekrobt is a hint with no step: a flagship\'s text is not counted', () => {
    const { pack } = bench({ faction: 'nekro', expansions: ['pok', 'te'] });
    quote(pack, id, "Your flagship gains the text abilities of that faction's flagship in addition to its own.");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
