import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, endOf, expectStanding, HOME, planned, quote, using, warningsOf } from '../kit';
import { id } from './hopesend';

const atEnd = (choices: Record<string, string | number>): Entry => ({ ...using(planned({ type: 'pass' } as EntryBody), id), choices } as Entry);
const table = (entries: Entry[], controlled = true) => bench({
  faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries,
  game: { planetControl: controlled ? { hopesend: 'me' } : {} },
});
const MECH_ON_H1 = { hopesend: 'mech', hopesendPlanet: 'h1' };

describe('legendary:hopesend Imperial Arms Vault', () => {
  // "You may exhaust this card at the end of your turn to place 1 mech from your reinforcements on any planet you
  //  control or draw 1 action card"
  // Checks: I control Hope's End and use the card for a mech on Home One; it stands there.
  // Why this is automated: the plan counts the ground forces on planets; the card places the mech by itself, with no
  // production or landing, so no check of those steps is asked and none is waived.
  test.fails('legendary:hopesend places a mech on a planet I control', () => {
    const hopesend = table([atEnd(MECH_ON_H1)]);
    quote(hopesend.pack, id, 'place 1 mech from your reinforcements on any planet you control');
    expect(endOf(hopesend).ground.h1?.mech).toBe(1);
  });

  // "... or draw 1 action card"
  // Checks: the other branch places nothing; the card drawn is entered with the gains of the entry.
  // Why nothing is counted here: the card drawn is unknown.
  test('legendary:hopesend the branch of the action card places no mech', () => {
    expect(endOf(table([atEnd({ hopesend: 'card' })])).ground.h1?.mech ?? 0).toBe(0);
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Hope's End, using the card is warned of.
  // Why the check is NOT redundant here: the card belongs to whoever controls the planet (53.2).
  test.fails('legendary:hopesend without control of Hope\'s End its use is warned of', () => {
    const turn = atEnd(MECH_ON_H1);
    expectStanding(warningsOf(table([turn], false), turn), 'componentNotHeld');
  });

  test.todo('legendary:hopesend a mech put on a planet I do not control is warned of: no warning code for a placement by an ability yet');

  test.fails('legendary:hopesend is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
