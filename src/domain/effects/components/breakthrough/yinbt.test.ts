import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './yinbt';

describe('breakthrough:yinbt Yin Ascendant', () => {
  // "When you gain this card or score a public objective, gain the alliance ability of a random, unused faction."
  // Checks: the breakthrough is a reminder of the status phase, where public objectives are scored.
  // Why nothing is validated here: the faction is drawn at random, so the plan cannot know which alliance ability is
  // gained (Yin notes: it is used as though that commander were unlocked); the player enters what it does by hand.
  test('breakthrough:yinbt is a hint of the status phase', () => {
    const { pack } = bench({ faction: 'yin', expansions: ['te'] });
    quote(pack, id, 'gain the alliance ability of a random, unused faction');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
