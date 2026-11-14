import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './checks';

describe('agenda:checks Checks and Balances', () => {
  // "For: When a player chooses a strategy card during the strategy phase, they give that strategy card to another
  //  player who does not have 1 ..., if able. Against: Each player readies only 3 of their planets at the end of this
  //  agenda phase."
  // Checks: the effect is a hint with no step.
  // Why nothing is validated: under "For" the cards I end up with are chosen by the other players, which the plan does
  // not know; my cards of a round are set by hand (`strategyCard`, `backupCard`). "Against" is a one-time readying,
  // and which planets stay exhausted is the players' choice, entered by hand.
  test('agenda:checks is a hint: the cards a player is given are other players\' choice', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'they give that strategy card to another player');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt ?? []).toEqual([]);
  });
});
