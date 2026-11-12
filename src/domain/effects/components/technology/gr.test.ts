import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './gr';

describe('technology:gr Genetic Recombination', () => {
  // "You may exhaust this card before a player casts votes; that player must cast at least 1 vote for an outcome of
  //  your choice or remove 1 token from their fleet pool and return it to their reinforcements."
  // Checks: the technology is a hint with no step: it is played in the agenda phase, which has no step in the plan.
  // Why nothing is validated here: votes are not counted, and whether the other player votes or gives up a fleet
  // token is their choice; a token they give up is entered by hand.
  test('technology:gr is a hint with no step', () => {
    const { pack } = bench({ faction: 'mahact', expansions: ['pok'] });
    quote(pack, id, 'remove 1 token from their fleet pool and return it to their reinforcements');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
