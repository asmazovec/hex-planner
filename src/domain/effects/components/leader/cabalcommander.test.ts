import { describe, expect, test } from 'vitest';
import type { LeaderState, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './cabalcommander';

/**
 * The Cabal activate their home system and produce `units` with the space dock on h1: 3 resources plus 2, a
 * Production of 5.
 */
const build = (units: UnitCounts, leaders: Record<string, LeaderState> = { [id]: 'unlocked' }, faction = 'cabal') => {
  const entry = tactical(HOME, { production: units });
  return { entry, ...bench({ faction, expansions: ['pok'], start: { leaders }, entries: [entry], game: { docks: ['h1'] } }) };
};

describe('leader:cabalcommander That Which Molds Flesh', () => {
  // "When you produce fighter or infantry units: Up to 2 of those units do not count against your PRODUCTION limit."
  // Checks: seven infantry from a dock of Production 5; the warning is listed and lifted by the commander.
  // Why the check is redundant here: LRR 67.2 counts every unit produced against the Production value; the commander
  // takes two infantry out of that count, and the other five fit.
  test('leader:cabalcommander two infantry beyond the Production limit: the warning is waived', () => {
    const table = build({ infantry: 7 });
    quote(table.pack, id, 'Up to 2 of those units do not count against your PRODUCTION limit');
    expectWaived(warningsOf(table, table.entry), 'productionOver', id);
  });

  // Checks: fighters are covered as infantry are: five cruisers and two fighters fit.
  // Why the check is redundant here: the card names fighters and infantry.
  test('leader:cabalcommander two fighters beside five ships are waived as well', () => {
    const table = build({ cruiser: 5, fighter: 2 });
    expectWaived(warningsOf(table, table.entry), 'productionOver', id);
  });

  // Checks: eight infantry: two are not counted, six are over five.
  // Why the check is NOT redundant here: "up to 2"; the third infantry beyond the limit counts.
  test('leader:cabalcommander a third unit beyond the limit stands', () => {
    const table = build({ infantry: 8 });
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // Checks: six cruisers and one infantry: one infantry out of the count leaves six ships over five.
  // Why the check is NOT redundant here: only fighters and infantry are left out; ships always count.
  test('leader:cabalcommander ships beyond the limit stand', () => {
    const table = build({ cruiser: 6, infantry: 1 });
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // LRR 51.6: a commander's ability is used only while it is unlocked.
  // Checks: with the commander locked the seven infantry are over the limit.
  // Why the check is NOT redundant here: a locked leader is not in force.
  test('leader:cabalcommander locked lifts nothing', () => {
    const table = build({ infantry: 7 }, {});
    expectStanding(warningsOf(table, table.entry), 'productionOver');
  });

  // Checks: within the limit nothing is warned of.
  test('leader:cabalcommander within the limit makes no warning', () => {
    const table = build({ infantry: 5 });
    expectNone(warningsOf(table, table.entry), 'productionOver');
  });

  test('leader:cabalcommander is a passive effect that waives the Production limit', () => {
    const { pack } = build({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['productionOver']);
  });
});
