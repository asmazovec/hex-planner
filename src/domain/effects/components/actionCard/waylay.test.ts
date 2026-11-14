import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './waylay';

const table = () => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] } });

describe('actionCard:waylay Waylay', () => {
  // "Hits from this roll are produced against all ships (not just fighters)."
  // Checks: the card is a hint, shown at the step combat; it waives nothing and changes no number.
  // Why nothing is validated here: Anti-fighter barrage is a roll; the plan simulates no combat and the losses are
  // entered by hand.
  test('actionCard:waylay is a hint at combat, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'Hits from this roll are produced against all ships');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['combat']);
    expect(found.modify).toBeUndefined();
  });
});
