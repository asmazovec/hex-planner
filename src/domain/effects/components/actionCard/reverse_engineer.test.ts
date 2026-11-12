import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './reverse_engineer';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:reverse_engineer Reverse Engineer', () => {
  // "Take that action card from the discard pile."
  // Checks: the card is a hint with no step of the plan; it waives nothing and changes no number.
  // Why nothing is validated here: Another player's discard is not planned, and the card taken is entered in «Gained
  // and discarded» like any card drawn; nothing is checked.
  test('actionCard:reverse_engineer is a hint without a step, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Take that action card from the discard pile.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(undefined);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });
});
