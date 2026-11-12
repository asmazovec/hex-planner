import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, FARTHER, HOME, NEAR, primary, quote, secondary } from '../kit';
import { id } from './minister_commerce';

/** The law comes into play in the strategy phase; `owner` is the player elected, me unless an opponent is named. */
const law = (owner?: string): Entry => ({ ...adjust({}, 'strategy'), gains: [id], ...(owner ? { owner } : {}) });

/** One opponent, whose cruiser stands at `where`: next to my home it makes us neighbours (LRR 60.1), far away not. */
const rival = (where: string) => ({ opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }], enemyUnits: { [where]: { x: { cruiser: 1 } } } });
const table = (entries: Entry[], where = NEAR) => bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries, game: rival(where) });

describe('agenda:minister_commerce Minister of Commerce', () => {
  // "After the owner of this card replenishes commodities, they gain 1 trade good for each player that is their neighbor."
  // Checks: the owner resolves Trade's primary (3 trade goods, commodities replenished) with one neighbour and ends
  // with 4 trade goods.
  // Why the check is redundant here: no check is lifted; the law adds to the trade goods the plan counts, after the
  // replenishing of 92.3.
  test('agenda:minister_commerce gives 1 trade good per neighbour when Trade replenishes commodities', () => {
    const minister = table([law(), primary(5)]);
    quote(minister.pack, id, 'they gain 1 trade good for each player that is their neighbor');
    expect(endOf(minister).tradeGoods).toBe(4);
  });

  // Checks: Trade's secondary replenishes commodities too (92.5) and brings the trade good as well.
  // Why: the law speaks of replenishing commodities, whichever ability does it.
  test('agenda:minister_commerce gives the trade good after Trade\'s secondary too', () => {
    expect(endOf(table([law(), secondary(5)])).tradeGoods).toBe(1);
  });

  // LRR 92.3: the primary gives 3 trade goods and replenishes commodities, nothing more.
  // Checks: without the law Trade's primary gives 3 trade goods.
  // Why the check is NOT redundant here: the law is not in play.
  test('agenda:minister_commerce not in play: Trade gives its 3 trade goods only', () => {
    expect(endOf(table([primary(5)])).tradeGoods).toBe(3);
  });

  // Checks: with no neighbour the law gives nothing.
  // Why the check is NOT redundant here: the trade goods are counted per neighbour (LRR 60), and the far cruiser is none.
  test('agenda:minister_commerce with no neighbour gives nothing more', () => {
    expect(endOf(table([law(), primary(5)], FARTHER)).tradeGoods).toBe(3);
  });

  // "The elected player gains this card."
  // Checks: the law elected another player: my Trade gives 3 trade goods only.
  // Why the check is NOT redundant here: the law is its owner's alone.
  test('agenda:minister_commerce owned by another player gives me nothing', () => {
    expect(endOf(table([law('x'), primary(5)])).tradeGoods).toBe(3);
  });

  test('agenda:minister_commerce is a passive effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
  });
});
