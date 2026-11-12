import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './zeal';

describe('ability:zeal Zeal', () => {
  // "You always vote first during the agenda phase. When you cast at least 1 vote: cast 1 additional vote for each
  //  player in the game including you."
  // Checks: the ability is a hint with no step.
  // Why nothing is validated: votes and the order of voting are not planned; the agenda phase has no step of the replay
  // (STEPS), so the reminder has no block to stand in.
  test('ability:zeal is a hint without a step: the agenda is not planned', () => {
    const { pack } = bench({ faction: 'argent', expansions: ['pok'] });
    quote(pack, id, 'cast 1 additional vote for each player in the game including you');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
