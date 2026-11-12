import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './vw';

describe('technology:vw Voidwatch', () => {
  // "After a player moves ships into a system that contains 1 or more of your units, they must give you 1 promissory
  //  note from their hand, if able."
  // Checks: the technology is a reminder at the movement step.
  // Why nothing is validated here: the note is given by the other player, of their choice (Voidwatch note 1), in
  // their turn; it is no transaction (note 2). The plan cannot know which note, so it is entered as a gain by hand.
  test('technology:vw is a hint shown at the movement', () => {
    const { pack } = bench({ faction: 'empyrean', expansions: ['pok'] });
    quote(pack, id, 'they must give you 1 promissory note from their hand, if able');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['movement']);
  });

  test.todo('technology:vw a rival moving into a system with my units gives me a note: the note is their choice, in their turn');
});
