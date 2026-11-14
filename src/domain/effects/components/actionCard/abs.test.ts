import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './abs';

describe('actionCard:abs Ancient Burial Sites', () => {
  // "Choose 1 player. Exhaust each cultural planet owned by that player."
  // LRR 8.4: "Step 3 – Ready Planets: Each player readies each of their exhausted planets."
  // Checks: the card is a hint with no step: the agenda phase has no block of a tactical action.
  // Why nothing is validated here: the card is played at the start of the agenda phase and the planets it exhausts
  // are readied at the end of that same phase (8.4); in between they only cast votes, which the plan does not count.
  test('actionCard:abs is a hint with no step of the action', () => {
    const { pack } = bench({ faction: 'hacan' });
    quote(pack, id, 'Exhaust each cultural planet owned by that player.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt ?? []).toEqual([]);
  });
});
