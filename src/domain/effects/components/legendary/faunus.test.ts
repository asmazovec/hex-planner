import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, endOf, expectStanding, planned, quote, using, warningsOf } from '../kit';
import { id } from './faunus';

const atPass = (choices?: Record<string, string | number>): Entry =>
  ({ ...using(planned({ type: 'pass' } as EntryBody), id), ...(choices ? { choices } : {}) } as Entry);
const table = (entries: Entry[], controlled = true) => bench({
  faction: 'sol', expansions: ['te'], entries, game: { planetControl: controlled ? { faunus: 'me' } : {} },
});

describe('legendary:faunus Maxis Central Control', () => {
  // "You may exhaust this card when you pass to gain control of a non-home, non-legendary planet that contains no
  //  units and has no attachments."
  // Checks: I control Faunus and use the card when I pass, choosing Target One, empty and nobody's; I control it after.
  // Why this is automated: control of planets is counted by the plan; the card gives it without a landing, so no
  // check of the invasion is asked and none is waived.
  test('legendary:faunus gives control of an empty planet when I pass', () => {
    const faunus = table([atPass({ faunusPlanet: 't1' })]);
    quote(faunus.pack, id, 'gain control of a non-home, non-legendary planet that contains no units and has no attachments');
    expect(endOf(faunus).control.t1).toBe('me');
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Faunus, using the card is warned of.
  // Why the check is NOT redundant here: the card belongs to whoever controls the planet (53.2).
  test('legendary:faunus without control of Faunus its use is warned of', () => {
    const turn = atPass({ faunusPlanet: 't1' });
    expectStanding(warningsOf(table([turn], false), turn), 'componentNotHeld');
  });

  // Checks: named with no planet chosen, no control changes.
  test('legendary:faunus with no planet chosen no control changes', () => {
    expect(endOf(table([atPass()])).control.t1).toBeUndefined();
  });

  test.todo('legendary:faunus a home or legendary planet, one with units or attachments, chosen for the card is warned of: no warning code for it yet');

  test('legendary:faunus is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
