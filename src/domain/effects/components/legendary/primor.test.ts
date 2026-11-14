import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, planned, quote, tactical, using, warningsOf } from '../kit';
import { id } from './primor';

/** A turn of mine that ends with the card exhausted for its choices: a pass unless `entry` is given. */
const atEnd = (choices: Record<string, string | number>, entry: Entry = planned({ type: 'pass' } as EntryBody)): Entry =>
  ({ ...using(entry, id), choices } as Entry);
const table = (entries: Entry[], controlled = true) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries,
  game: { planetControl: controlled ? { primor: 'me' } : {} },
});
const TWO_ON_H1 = { primorPlanet: 'h1', primorInfantry: 2 };

describe('legendary:primor The Atrament', () => {
  // "You may exhaust this card at the end of your turn to place up to 2 infantry from your reinforcements on any
  //  planet you control"
  // Checks: I control Primor and use the card at the end of my turn for 2 infantry on Home One; they stand there.
  // Why this is automated: the plan counts the ground forces on planets, and the card places them by itself, without
  // production or landing, so no check of those steps is asked and none is waived.
  test('legendary:primor places 2 infantry on a planet I control', () => {
    const turn = atEnd(TWO_ON_H1);
    const primor = table([turn]);
    quote(primor.pack, id, 'place up to 2 infantry from your reinforcements on any planet you control');
    expect(endOf(primor).ground.h1?.infantry).toBe(2);
  });

  // "You may exhaust this card ..."
  // Checks: the card is exhausted by its use.
  test('legendary:primor is exhausted by its use', () => {
    expect(endOf(table([atEnd(TWO_ON_H1)])).holdings.exhausted).toContain(id);
  });

  // LRR 34.1: "When a player exhausts a card, they flip the card facedown." An exhausted card cannot be used until it
  //  is readied (34.2).
  // Checks: a second use in the same round is warned of.
  // Why the check is NOT redundant here: the card is used once until the status phase readies it.
  test('legendary:primor used twice in a round, the second use is warned of', () => {
    const first = atEnd(TWO_ON_H1, tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }));
    const second = atEnd(TWO_ON_H1);
    expectStanding(warningsOf(table([first, second]), second), 'componentExhausted');
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Primor, using the card is warned of.
  // Why the check is NOT redundant here: the card lies in the play area of the player who controls Primor only
  // (53.2); the replay passes every legendary card as held today.
  test('legendary:primor without control of Primor its use is warned of', () => {
    const turn = atEnd(TWO_ON_H1);
    expectStanding(warningsOf(table([turn], false), turn), 'componentNotHeld');
  });

  test.todo('legendary:primor infantry put on a planet I do not control, or more than 2, are warned of: no warning code for a placement by an ability yet');

  test('legendary:primor is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
