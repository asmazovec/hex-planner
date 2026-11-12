import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './st';

/** A tactical action in the home system produces `units` at the space dock of h1 and pays with h2 alone (1 resource). */
const produce = (units: UnitCounts, technologies: string[] = [id]) => {
  const move = tactical(HOME, { production: units, payment: { planets: ['h2'], tradeGoods: 0 } });
  const table = bench({ faction: 'sol', start: { technologies }, entries: [move], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } });
  return { move, ...table };
};

const shortOf = (table: ReturnType<typeof produce>) => warningsOf(table, table.move).find(w => w.code === 'shortResources')?.params;

describe('technology:st Sarween Tools', () => {
  // "When 1 or more of your units use PRODUCTION, reduce the combined cost of the produced units by 1."
  // Checks: a cruiser (cost 2) produced by the space dock is paid with 1 resource and nothing is warned of.
  // Why the check is redundant here: the check is not lifted, its number changes: LRR 67.1 asks resources equal to
  // the cost, and the card takes 1 from the combined cost, so this is a `modify` and nothing is listed as waived.
  test('technology:st a cruiser produced by a space dock costs 1: paid with 1 resource, no warning', () => {
    const table = produce({ cruiser: 1 });
    quote(table.pack, id, 'reduce the combined cost of the produced units by 1');
    expectNone(warningsOf(table, table.move), 'shortResources');
  });

  // "... the combined cost ..."
  // Checks: a dreadnought (cost 4) paid with 1 resource is still short, and the warning names the reduced cost of 3.
  // Why the check is NOT redundant here: the card takes 1 off once per production, not the whole cost.
  test('technology:st takes off 1 only: the shortfall is counted against the reduced cost', () => {
    const table = produce({ dreadnought: 1 });
    expectStanding(warningsOf(table, table.move), 'shortResources');
    expect(shortOf(table)).toMatchObject({ needed: 3, paid: 1 });
  });

  // LRR 67.1: "To produce a unit, a player must spend a number of resources equal to or greater than the cost value of
  //  the unit they are producing."
  // Checks: without the card the cruiser paid with 1 resource is short by 1.
  // Why the check is NOT redundant here: nothing this player holds reduces the cost.
  test('technology:st not held: the cruiser paid with 1 resource is short', () => {
    const table = produce({ cruiser: 1 }, []);
    expectStanding(warningsOf(table, table.move), 'shortResources');
    expect(shortOf(table)).toMatchObject({ needed: 2, paid: 1 });
  });

  // Checks: nothing produced costs nothing; the card does not make a cost below zero or a payment owed.
  test('technology:st with nothing produced nothing is owed', () => {
    const table = produce({});
    expectNone(warningsOf(table, table.move), 'shortResources');
  });

  // Ruling (Sarween Tools 1): "If units are produced without any unit using its Production ability, Sarween Tools will
  //  not provide a reduction to the cost."
  // Checks: two infantry (cost 1) entered as produced in a system with no space dock, so with no unit using
  // PRODUCTION, and nothing paid, are still short by 1.
  // Why the check is NOT redundant here: no unit used PRODUCTION, so the card's condition is not met.
  test('technology:st gives nothing to a production without a unit using PRODUCTION', () => {
    const move = tactical(HOME, { production: { infantry: 2 }, payment: { planets: [], tradeGoods: 0 } });
    const table = bench({ faction: 'sol', start: { technologies: [id, 'technology:ie'] }, entries: [move], game: { planetControl: { h1: 'me' } } });
    expectStanding(warningsOf(table, move), 'shortResources');
  });

  test('technology:st is a passive effect that changes a number, with no waiver', () => {
    const { pack } = produce({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify).toBeDefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
