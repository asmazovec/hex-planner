import { describe, expect, test } from 'vitest';
import type { StartHoldings, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './solbt';

/**
 * A production in the home system, whose space dock on h1 (3 resources) has PRODUCTION 5. The Sol carrier (Advanced
 * Carrier) has capacity 6.
 */
const build = (faction: string, production: UnitCounts, start: StartHoldings = { breakthrough: 'held' }) => {
  const entry = tactical(HOME, { production });
  return { entry, ...bench({ faction, expansions: ['te'], start, entries: [entry], game: { docks: ['h1'] } }) };
};

describe('breakthrough:solbt Bellum Gloriosum', () => {
  // "When you produce a ship that has capacity, you may also produce any combination of ground forces or fighters up to
  //  that ship's capacity; they do not count against your PRODUCTION limit."
  // Checks: a carrier and six infantry are seven units against PRODUCTION 5; the warning is listed and lifted.
  // Why the check is redundant here: 68.1 counts every unit produced against the limit; the breakthrough says the six
  // infantry up to the carrier's capacity are not counted, which leaves one unit against five.
  test.fails('breakthrough:solbt the ground forces up to the capacity of the carrier produced do not count against PRODUCTION', () => {
    const table = build('sol', { carrier: 1, infantry: 6 });
    quote(table.pack, id, 'they do not count against your PRODUCTION limit');
    expectWaived(warningsOf(table, table.entry), 'productionOver', id);
  });

  // Ruling (Sol, Bellum Gloriosum 1): "the combined capacity is used to determine how many fighters and ground forces
  //  do not count towards the Production limit."
  // Checks: two carriers and twelve fighters and infantry are fourteen units; two carriers count, the rest is free.
  // Why the check is redundant here: the capacity of every ship produced together frees the units carried.
  test.fails('breakthrough:solbt the capacity of all the ships produced together is counted', () => {
    const table = build('sol', { carrier: 2, infantry: 6, fighter: 6 });
    expectWaived(warningsOf(table, table.entry), 'productionOver', id);
  });

  // "... up to that ship's capacity"
  // Checks: a carrier, six infantry and five cruisers: beyond the six carried, six units remain against five.
  // Why the check is NOT redundant here: what the capacity does not free still counts against the limit.
  test('breakthrough:solbt what is beyond the capacity still counts: the warning stands', () => {
    const table = build('sol', { carrier: 1, infantry: 6, cruiser: 5 });
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // "When you produce a ship that has capacity"
  // Checks: seven infantry with no ship are seven units against five.
  // Why the check is NOT redundant here: no ship with capacity is produced, so nothing is freed.
  test('breakthrough:solbt without a ship with capacity produced, the ground forces count', () => {
    const table = build('sol', { infantry: 7 });
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // LRR 68.1.
  // Checks: the same production without the breakthrough stands.
  // Why the check is NOT redundant here: the breakthrough is not held.
  test('breakthrough:solbt not held, the carrier and its infantry count against PRODUCTION', () => {
    const table = build('sol', { carrier: 1, infantry: 6 }, {});
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // Checks: the breakthrough is in force while held and lifts the PRODUCTION limit check.
  test.fails('breakthrough:solbt is a passive effect that waives the PRODUCTION limit', () => {
    const { pack } = build('sol', {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['productionOver']);
  });
});
