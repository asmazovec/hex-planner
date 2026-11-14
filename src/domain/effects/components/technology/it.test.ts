import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, quote, using, warningsOf } from '../kit';
import { id } from './it';

/**
 * The cancelled action card is another player's and is not planned; the Xxcha player marks the use of the technology on
 * an entry of their own, an adjustment made for it.
 */
const cancel = (): Entry => using(adjust({}), id);
const table = (entries: Entry[]) => bench({ faction: 'xxcha', start: { technologies: [id] }, entries });

describe('technology:it Instinct Training', () => {
  // "You may exhaust this card and spend 1 token from your strategy pool when another player plays an action card;
  //  cancel that action card."
  // Checks: the technology named in «Used» spends 1 strategy token: the pool goes from 2 to 1.
  // Why this is the component's own: no rule spends a strategy token to cancel a card; the card is not planned, the
  // token is.
  test('technology:it spends 1 strategy token', () => {
    const xxcha = table([cancel()]);
    quote(xxcha.pack, id, 'exhaust this card and spend 1 token from your strategy pool');
    expect(endOf(xxcha).strategy).toBe(1);
  });

  // LRR 20.4: tokens are spent from a pool that has them.
  // Checks: with the strategy pool empty the use is still entered and warned of.
  // Why the check is NOT redundant here: the token is the price, nothing pays it in its place.
  test('technology:it with an empty strategy pool is warned of', () => {
    const use = cancel();
    expectStanding(warningsOf(table([adjust({ strategy: -2 }), use]), use), 'shortStrategy');
  });

  // "... exhaust this card ..." LRR 34.1.
  // Checks: a second use in the round finds the card exhausted.
  test('technology:it is exhausted by its use: a second one in the round is warned of', () => {
    const again = cancel();
    expectStanding(warningsOf(table([cancel(), again]), again), 'componentExhausted');
  });

  // Checks: the technology held and not used spends nothing.
  test('technology:it not used spends no token', () => {
    expect(endOf(table([adjust({})])).strategy).toBe(2);
  });

  test('technology:it is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
