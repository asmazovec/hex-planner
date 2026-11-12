import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, endOf, expectStanding, planned, quote, using, warningsOf } from '../kit';
import { id } from './ordinian';

const pass = (): Entry => planned({ type: 'pass' } as EntryBody);
const atPass = (choices?: Record<string, string | number>): Entry => ({ ...using(pass(), id), ...(choices ? { choices } : {}) } as Entry);
const table = (entries: Entry[], controlled = true) => bench({
  faction: 'sol', expansions: ['te'], entries, game: { planetControl: controlled ? { ordinian: 'me' } : {} },
});

describe('legendary:ordinian 4X41D "Hyperion" VI', () => {
  // "You may exhaust this card when you pass to draw 1 action card and gain 1 command token."
  // Checks: I control Ordinian and use the card when I pass, the token going to the tactic pool: one more there.
  // Why this is automated: the command tokens of the pools are counted by the plan, and the card gives one by itself.
  test('legendary:ordinian gives 1 command token to the chosen pool when I pass', () => {
    const ordinian = table([atPass({ ordinianPool: 'tactic' })]);
    quote(ordinian.pack, id, 'exhaust this card when you pass to draw 1 action card and gain 1 command token');
    expect(endOf(ordinian).tactic).toBe(endOf(table([pass()])).tactic + 1);
  });

  // LRR 53.3: "Players can use the abilities on the legendary planet ability cards in their play area."
  // Checks: without control of Ordinian, using the card is warned of.
  // Why the check is NOT redundant here: the card belongs to whoever controls the planet (53.2).
  test('legendary:ordinian without control of Ordinian its use is warned of', () => {
    const turn = atPass({ ordinianPool: 'tactic' });
    expectStanding(warningsOf(table([turn], false), turn), 'componentNotHeld');
  });

  // Checks: named with no pool chosen, no pool changes; the action card drawn is unknown and entered with gains.
  test('legendary:ordinian with no pool chosen no pool changes', () => {
    expect(endOf(table([atPass()])).tactic).toBe(endOf(table([pass()])).tactic);
  });

  test.todo('legendary:ordinian used on a turn that is not a pass is warned of: no warning code for a component used outside its window yet');

  test('legendary:ordinian is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
