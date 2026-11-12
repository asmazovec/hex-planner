import { describe, expect, test } from 'vitest';
import type { Opponent } from '../../../types';
import { bench, effect, endOf, expectNone, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './greyfire';

const YIN: Opponent = { id: 'o1', faction: 'yin', vp: 0, seat: 2, color: 2 };
/** The Yin player's note, held by me (Sol) under its address. */
const NOTE = `${id}@o1`;
const table = () => {
  const turn = using(tactical(NEAR), NOTE);
  return { turn, ...bench({ faction: 'sol', units: { [NEAR]: { carrier: 1 } }, start: { promissory: [NOTE] }, entries: [turn], game: { opponents: [YIN] } }) };
};

describe('promissory:greyfire Greyfire Mutagen', () => {
  // "At the start of a ground combat against 2 or more ground forces that are not controlled by the Yin player:
  //  Replace 1 of your opponent's infantry with 1 infantry from your reinforcements."
  // Checks: the note is a reminder in the block of the invasion and nothing else.
  // Why nothing is validated here: the replacement happens inside a ground combat, and the plan simulates no combat:
  // the ground forces lost and won are entered by the player as the result of the invasion.
  test('promissory:greyfire is a hint of the invasion', () => {
    const { pack } = table();
    quote(pack, id, 'Replace 1 of your opponent\'s infantry with 1 infantry from your reinforcements');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "Then, return this card to the Yin player." (LRR 69.3)
  // Checks: named in the `uses` of my turn, the note leaves my hand and goes back to the Yin player, with no warning.
  // Why the check is NOT redundant here: what the note does to the board is not counted, but its holding is (69.3).
  test('promissory:greyfire played goes back to the Yin player', () => {
    const t = table();
    quote(t.pack, id, 'Then, return this card to the Yin player.');
    expectNone(warningsOf(t, t.turn), 'componentNotHeld');
    const end = endOf(t);
    expect(end.holdings.promissory).not.toContain(NOTE);
    expect(end.rivals?.o1.holdings.promissory).toContain(NOTE);
  });
});
