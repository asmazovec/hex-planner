import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './argentbt';

describe('breakthrough:argentbt Wing Transfer', () => {
  // "When you activate a system that contains only your units, you may place command tokens from your reinforcements
  //  into any systems adjacent to that system that contain only your units"
  // Checks: for now the breakthrough is a reminder at the activation.
  // Why nothing is validated yet: what it does is counted by the plan (tokens on the map, ships moved), but a tactical
  // entry cannot hold tokens put down beside its active system nor moves after its production; until it can, the
  // player enters them by hand. See the todos.
  test('breakthrough:argentbt is a hint at the activation', () => {
    const { pack } = bench({ faction: 'argent', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may place command tokens from your reinforcements into any systems adjacent to that system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.todo('breakthrough:argentbt places command tokens in adjacent systems that contain only my units: a tactical entry holds no tokens put down outside its active system');
  test.todo('breakthrough:argentbt moves ships among the active system and adjacent systems with my tokens at the end of the action, after fleet pool and capacity hold there (Argent, Wing Transfer note 1): a tactical entry has no moves after its production');
});
