import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './telepathic';

describe('ability:telepathic Telepathic', () => {
  // "At the end of the strategy phase: Place the Naalu "0" token on your strategy card; you are first in initiative order."
  // Checks: the ability is a reminder of the round.
  // Why nothing is validated: the plan keeps no initiative order, so going first changes no number and no check.
  // A hint on an ability is kept in the registry but not shown yet (a known limit of the foundation).
  test('ability:telepathic is a hint of the round: the plan keeps no initiative order', () => {
    const { pack } = bench({ faction: 'naalu' });
    quote(pack, id, 'you are first in initiative order');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['round']);
  });
});
