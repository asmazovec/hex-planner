import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, planned, quote, using, warningsOf } from '../kit';
import { id } from './mirage';

const atEnd = (choices: Record<string, string | number>): Entry => ({ ...using(planned({ type: 'pass' } as EntryBody), id), choices } as Entry);
const table = (entries: Entry[], controlled = true) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries,
  game: { planetControl: controlled ? { mirage: 'me' } : {} },
});
const TWO_AT_HOME = { mirageSystem: HOME, mirageFighters: 2 };

describe('legendary:mirage Mirage Flight Academy', () => {
  // "You may exhaust this card at the end of your turn to place up to 2 fighters from your reinforcements in any
  //  system that contains 1 or more of your ships"
  // Checks: I control Mirage and use the card for 2 fighters in the home system, where my carrier is; they stand there.
  // Why this is automated: the plan counts the units in space areas; the card places them by itself, with no
  // production, so the checks of production are not asked and none is waived.
  test('legendary:mirage places 2 fighters in a system with my ships', () => {
    const mirage = table([atEnd(TWO_AT_HOME)]);
    quote(mirage.pack, id, 'place up to 2 fighters from your reinforcements in any system that contains 1 or more of your ships');
    expect(endOf(mirage).systems[HOME]?.fighter).toBe(2);
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Mirage, using the card is warned of.
  // Why the check is NOT redundant here: the card belongs to whoever controls the planet (53.2).
  test('legendary:mirage without control of Mirage its use is warned of', () => {
    const turn = atEnd(TWO_AT_HOME);
    expectStanding(warningsOf(table([turn], false), turn), 'componentNotHeld');
  });

  // Checks: the card is exhausted by its use, so its passive presence changes nothing more this round.
  test('legendary:mirage is exhausted by its use', () => {
    expect(endOf(table([atEnd(TWO_AT_HOME)])).holdings.exhausted).toContain(id);
  });

  test.todo('legendary:mirage fighters put in a system without my ships, or more than 2, are warned of: no warning code for a placement by an ability yet');

  test('legendary:mirage is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
