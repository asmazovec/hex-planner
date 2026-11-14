import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './war_funding';

const NOTE = `${id}@me`;

describe('promissory:war_funding War Funding', () => {
  // "After you and your opponent roll dice during space combat: You may reroll all of your opponent's dice. You may
  //  reroll any number of your dice."
  // Checks: the note is a reminder of the combat step and changes nothing the plan counts.
  // Why nothing is validated here: rerolls are dice; the plan simulates no combat, so there is no check to lift and
  // no number to change.
  test('promissory:war_funding is a hint of the combat', () => {
    const { pack } = bench({ faction: 'letnev' });
    quote(pack, id, "You may reroll all of your opponent's dice.");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Letnev naming their own War Funding in a tactical action is warned of.
  // Why the check is NOT redundant here: the card is written for the Letnev's opponents ("return this card to the
  // Letnev player"); nothing lifts 69.2 for its owner.
  test('promissory:war_funding played by the Letnev themselves is warned of as their own note', () => {
    const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), NOTE);
    const table = bench({ faction: 'letnev', units: { [HOME]: { cruiser: 1 } }, start: { promissory: [NOTE] }, entries: [move] });
    quote(table.pack, id, 'Then, return this card to the Letnev player.');
    expectStanding(warningsOf(table, move), 'ownPromissory');
  });
});
