import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './quash';

/** Quash used in the agenda phase: a component entry of that phase, as any spending there is entered. */
const quash = (): Entry => planned({ type: 'component', componentId: id, note: '' } as EntryBody, 'agenda');
const table = (faction: string, entries: Entry[]) => bench({ faction, entries });

describe('ability:quash Quash', () => {
  // "When an agenda is revealed: You may spend 1 token from your strategy pool to discard that agenda and reveal 1
  //  agenda from the top of the deck."
  // Checks: Quash used in the agenda phase spends 1 strategy token: the pool goes from 2 to 1.
  // Why this is the component's own: no rule spends a strategy token in the agenda phase; the agenda itself is not
  // planned, the token is.
  test('ability:quash spends 1 strategy token', () => {
    const xxcha = table('xxcha', [quash()]);
    quote(xxcha.pack, id, 'You may spend 1 token from your strategy pool to discard that agenda');
    expect(endOf(xxcha).strategy).toBe(1);
  });

  // LRR 20.4 / 81.5: tokens are spent from a pool that has them.
  // Checks: with the strategy pool empty, Quash is still entered and warned of.
  // Why the check is NOT redundant here: the token is the price of Quash, nothing pays it in its place.
  test('ability:quash with an empty strategy pool is warned of', () => {
    const use = quash();
    expectStanding(warningsOf(table('xxcha', [adjust({ strategy: -2 }), use]), use), 'shortStrategy');
  });

  // Ruling (Xxcha, Quash 3): "Quash may be used on the replacement agenda."
  // Checks: used twice in one agenda phase, it spends two tokens.
  test('ability:quash used twice spends two tokens', () => {
    expect(endOf(table('xxcha', [quash(), quash()])).strategy).toBe(0);
  });

  test('ability:quash is a play effect', () => {
    const { pack } = table('xxcha', []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
