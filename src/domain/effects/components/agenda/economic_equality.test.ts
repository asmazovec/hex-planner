import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './economic_equality';

/** The agenda phase resolves the directive "For": the entry gains it. */
const resolved = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });

describe('agenda:economic_equality Economic Equality', () => {
  // "For: Each player returns all of their trade goods to the supply. Then, each player gains 5 trade goods."
  // Checks: with 2 trade goods before, the resolved directive leaves me with exactly 5.
  // Why the check is redundant here: there is no check; the directive changes a number the plan counts, so the plan
  // must count it or every later payment with trade goods is wrong.
  test('agenda:economic_equality "For" sets my trade goods to 5', () => {
    const table = bench({ faction: 'sol', entries: [adjust({ tradeGoods: 2 }), resolved()] });
    quote(table.pack, id, 'Then, each player gains 5 trade goods.');
    expect(endOf(table).tradeGoods).toBe(5);
  });

  // "Each player returns all of their trade goods to the supply. Then, ..."
  // Checks: with 8 trade goods before, the result is still 5: the old ones are returned, not added to.
  test('agenda:economic_equality "For" returns the trade goods beyond 5', () => {
    const table = bench({ faction: 'sol', entries: [adjust({ tradeGoods: 8 }), resolved()] });
    expect(endOf(table).tradeGoods).toBe(5);
  });

  // Checks: without the directive the trade goods stay as they were, so the tests above are not empty.
  // Why the check is NOT redundant here: nothing resolved the directive.
  test('agenda:economic_equality not resolved leaves the trade goods alone', () => {
    const table = bench({ faction: 'sol', entries: [adjust({ tradeGoods: 2 })] });
    expect(endOf(table).tradeGoods).toBe(2);
  });

  test.todo('agenda:economic_equality "For" gives every opponent 5 trade goods too: a directive played on my entry reaches only my state');
  test.todo('agenda:economic_equality "Against" returns every trade good: an entry cannot name the outcome of a directive yet');

  test('agenda:economic_equality is a play effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
