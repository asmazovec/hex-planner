import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './investments';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:investments Manipulate Investments', () => {
  // "Place a total of 5 trade goods from the supply on strategy cards of your choice. You must place these tokens on
  // at least 3 different cards."
  // Checks: the card is a hint with no step of the plan; it waives nothing and changes no number.
  // Why nothing is validated here: The plan keeps no trade goods on strategy cards: the choice of cards is not
  // replayed, so what lies on a card and who picks it up is not counted. The strategy phase has no step, so the
  // reminder has no block.
  test('actionCard:investments is a hint without a step, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Place a total of 5 trade goods from the supply on strategy cards of your choice.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(undefined);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });
});
