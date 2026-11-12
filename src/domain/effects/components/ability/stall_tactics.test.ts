import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectNone, quote, warningsOf } from '../kit';
import { id } from './stall_tactics';

const CARD = 'actionCard:abs';

describe('ability:stall_tactics Stall Tactics', () => {
  // "ACTION: Discard 1 action card from your hand"
  // Checks: the component action discards the card it spends: the card leaves the hand, and nothing is warned of.
  // Why nothing more is validated here: the discard is the `spends` of the entry, which every entry already counts;
  // the ability's only point is that it is a component action, which the entry already is.
  test('ability:stall_tactics as a component action discards the card it spends', () => {
    const stall = componentAction(id, { spends: [CARD] });
    const t = bench({ faction: 'yssaril', start: { hand: [CARD] }, entries: [stall] });
    quote(t.pack, id, 'ACTION: Discard 1 action card from your hand');
    expectNone(warningsOf(t, stall), 'componentNotHeld');
    expect(endOf(t).holdings.hand).toEqual([]);
  });

  test('ability:stall_tactics is a hint with no waiver', () => {
    const { pack } = bench({ faction: 'yssaril' });
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
