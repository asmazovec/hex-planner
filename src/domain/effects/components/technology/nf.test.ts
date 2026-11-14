import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, expectStanding, quote, using, warningsOf } from '../kit';
import { id } from './nf';

/**
 * The turn it ends is another player's and is not planned; the Xxcha player marks the use of the technology on an
 * entry of their own, an adjustment made for it.
 */
const nullify = (): Entry => using(adjust({}), id);
const table = (entries: Entry[]) => bench({ faction: 'xxcha', start: { technologies: [id] }, entries });

describe('technology:nf Nullification Field', () => {
  // "After another player activates a system that contains 1 or more of your ships, you may exhaust this card and
  //  spend 1 token from your strategy pool; immediately end that player's turn."
  // Checks: the technology named in «Used» spends 1 strategy token: the pool goes from 2 to 1.
  // Why this is the component's own: no rule spends a strategy token to end a turn; the turn is not planned, the
  // token is.
  test('technology:nf spends 1 strategy token', () => {
    const xxcha = table([nullify()]);
    quote(xxcha.pack, id, 'exhaust this card and spend 1 token from your strategy pool');
    expect(endOf(xxcha).strategy).toBe(1);
  });

  // LRR 20.4: tokens are spent from a pool that has them.
  // Checks: with the strategy pool empty the use is still entered and warned of.
  // Why the check is NOT redundant here: the token is the price, nothing pays it in its place.
  test('technology:nf with an empty strategy pool is warned of', () => {
    const use = nullify();
    expectStanding(warningsOf(table([adjust({ strategy: -2 }), use]), use), 'shortStrategy');
  });

  // "... exhaust this card ..." LRR 34.1.
  // Checks: a second use in the round finds the card exhausted.
  test('technology:nf is exhausted by its use: a second one in the round is warned of', () => {
    const again = nullify();
    expectStanding(warningsOf(table([nullify(), again]), again), 'componentExhausted');
  });

  test.todo('technology:nf the other player\'s turn ends: opponents\' turns are not replayed step by step');

  test('technology:nf is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
