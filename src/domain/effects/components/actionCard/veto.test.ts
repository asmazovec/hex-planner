import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './veto';

describe('actionCard:veto Veto', () => {
  // "When an agenda is revealed: Discard that agenda and reveal 1 agenda from the top of the deck. Players vote on this
  //  agenda instead."
  // Checks: the card is a hint with no step of a tactical action: the agenda phase has none.
  // Why nothing is validated: the agenda deck and the votes are not counted by the plan; the law that is finally
  // passed is entered as a gain of the agenda entry, whatever agenda it was.
  test('actionCard:veto is a hint without a step', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'Discard that agenda and reveal 1 agenda from the top of the deck.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
