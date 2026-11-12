import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './foresight';

describe('ability:foresight Foresight', () => {
  // "After another player moves ships into a system that contains 1 or more of your ships: You may place 1 token from
  //  your strategy pool in an adjacent system that does not contain another player's ships; move your ships from the
  //  active system into that system."
  // Checks: the ability is a reminder of the movement step.
  // Why nothing is validated: it is a reaction in another player's tactical action; the plan replays that action as the
  // rival's, and my escape is entered by hand where I expect it.
  test('ability:foresight is a hint of the movement: a reaction in another player\'s action', () => {
    const { pack } = bench({ faction: 'naalu' });
    quote(pack, id, 'You may place 1 token from your strategy pool in an adjacent system');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  test.todo('ability:foresight spends a strategy token and moves my ships out during a rival\'s action: the plan has no reaction of mine inside another player\'s entry');
});
