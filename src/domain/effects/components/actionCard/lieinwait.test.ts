import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './lieinwait';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] } });

describe('actionCard:lieinwait Lie in Wait', () => {
  // "Look at each of those players' hands of action cards, then choose and take 1 action card from each."
  // Checks: the card is a hint, shown at the step transaction; it waives nothing and changes no number.
  // Why nothing is validated here: It answers a transaction between two other players, which the plan does not hold
  // in my entries, and the cards taken are another player's choice made at the table; they are entered in «Gained and
  // discarded» by hand.
  test('actionCard:lieinwait is a hint at transaction, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'choose and take 1 action card from each.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['transaction']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });
});
