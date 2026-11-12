import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './rescue';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { hand: [id] } });

describe('actionCard:rescue Rescue', () => {
  // "You may move 1 of your ships into the active system from any system that does not contain one of your command
  // tokens."
  // Checks: the card is a hint, shown at the step movement; it waives nothing and changes no number.
  // Why nothing is validated here: The move happens inside another player's tactical action; my ships move only in my
  // own entries, and the replay asks waivers of the owner of an entry only, so the card has nothing to lift or count
  // yet.
  test('actionCard:rescue is a hint at movement, with no waiver and no change of a number', () => {
    const { pack } = table();
    quote(pack, id, 'You may move 1 of your ships into the active system');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['movement']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
  });

  test.todo('actionCard:rescue moving my ship inside another player\'s tactical action: an entry holds the moves of its owner only');
});
