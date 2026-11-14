import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './nomadcommander';

/** The Nomad produce at the dock of Home One (3 resources) and pay with `planets`. */
const build = (production: UnitCounts, planets: string[], leaders: Record<string, 'unlocked'> = { [id]: 'unlocked' }, faction = 'nomad') => {
  const move: Entry = tactical(HOME, { production, payment: { planets, tradeGoods: 0 } });
  return { move, ...bench({ faction, expansions: ['pok'], start: { leaders }, entries: [move], game: { docks: ['h1'] } }) };
};

describe('leader:nomadcommander Navarch Feng', () => {
  // "When you produce: You can produce your flagship without spending resources."
  // Checks: with the commander unlocked the flagship is produced with nothing paid, and no shortage is warned of.
  // Why the check is redundant here: the payment check (26.1) asks for the flagship's cost of 8; the commander says
  // no resources are spent on it, so the flagship adds nothing to what must be paid (a `modify` of the cost, so
  // nothing is listed as waived).
  test('leader:nomadcommander the flagship is produced without spending resources', () => {
    const table = build({ flagship: 1 }, []);
    quote(table.pack, id, 'You can produce your flagship without spending resources.');
    expectNone(warningsOf(table, table.move), 'shortResources');
  });

  // Checks: the rest of the production is still paid: a carrier beside the flagship costs 3, paid with Home One.
  // Why the check is redundant here: only the flagship is free; the carrier's 3 are met.
  test('leader:nomadcommander a carrier beside the flagship is paid for alone', () => {
    const table = build({ flagship: 1, carrier: 1 }, ['h1']);
    expectNone(warningsOf(table, table.move), 'shortResources');
  });

  // Checks: the same carrier unpaid is short.
  // Why the check is NOT redundant here: the card frees the flagship only, every other unit costs as printed.
  test('leader:nomadcommander does not pay for other units: an unpaid carrier is short', () => {
    const table = build({ carrier: 1 }, []);
    expectStanding(warningsOf(table, table.move), 'shortResources');
  });

  // LRR 26.1, with the commander locked (51.6: a commander's ability is used once it is unlocked).
  // Checks: without the commander unlocked the flagship costs 8 and an unpaid one is short.
  // Why the check is NOT redundant here: a locked commander gives nothing.
  test('leader:nomadcommander locked, the flagship costs its 8', () => {
    const table = build({ flagship: 1 }, [], {});
    expectStanding(warningsOf(table, table.move), 'shortResources');
  });

  // Ruling (Nomad, Navarch Feng 1): "Producing the flagship still counts towards Production limits."
  // Checks: Home One's dock produces 5 (3 resources + 2); the free flagship and five fighters (3 to pay, paid by
  // Home One) are six units, over the limit.
  // Why the check is NOT redundant here: the card speaks of resources, not of the Production value.
  test('leader:nomadcommander the flagship still counts towards the Production limit', () => {
    const table = build({ flagship: 1, fighter: 5 }, ['h1']);
    expectStanding(warningsOf(table, table.move), 'productionOver');
  });

  test('leader:nomadcommander is a passive effect that changes the cost of units', () => {
    const { pack } = build({}, []);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.unitCost?.(8, { faction: 'nomad', unit: 'flagship' })).toBe(0);
    expect(effect(pack, id).modify?.unitCost?.(3, { faction: 'nomad', unit: 'carrier' })).toBe(3);
  });
});
