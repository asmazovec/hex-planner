import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './rout';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:rout Rout', () => {
  // "Your opponent must announce a retreat, if able."
  // Checks: the card is a hint, shown at the step combat; it waives nothing and changes no number.
  // Why nothing is validated here: The plan simulates no combat and no retreat: a retreat is the other player's move,
  // entered by hand as their losses or their entry.
  test('actionCard:rout is a hint at combat, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Your opponent must announce a retreat, if able.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['combat']);
    expect(found.modify).toBeUndefined();
  });
});
