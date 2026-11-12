import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './assassin';

describe('actionCard:assassin Assassinate Representative', () => {
  // "Choose 1 player. That player cannot vote on this agenda."
  // Checks: the card is a hint with no step: it is played in the agenda phase, which has no block of an action.
  // Why nothing is validated here: votes are not counted by the plan, and the card changes nothing else.
  test('actionCard:assassin is a hint with no step of the action', () => {
    const { pack } = bench({ faction: 'hacan' });
    quote(pack, id, 'That player cannot vote on this agenda.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt ?? []).toEqual([]);
    expect(found.waive).toBeUndefined();
  });
});
