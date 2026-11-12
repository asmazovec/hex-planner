import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, FAR, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './dt2';

const cabal = (options: { units?: Record<string, UnitCounts>; entry: ReturnType<typeof tactical>; dock: string; technologies?: string[] }) =>
  bench({ faction: 'cabal', expansions: ['pok'], units: options.units, start: { technologies: options.technologies ?? [id] }, entries: [options.entry], game: { docks: [options.dock] } });

/** The Cabal activate their home system and produce `units` with the dock on `dock`. */
const build = (units: UnitCounts, dock = 'h2', technologies?: string[]) => {
  const entry = tactical(HOME, { production: units });
  return { entry, ...cabal({ entry, dock, technologies }) };
};

/** A cruiser comes home from the next system, where `fighters` wait in the space area of the home system, with a dock on h1. */
const homecoming = (fighters: number, technologies?: string[]) => {
  const entry = tactical(HOME, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
  return { entry, ...cabal({ entry, dock: 'h1', technologies, units: { [HOME]: { fighter: fighters }, [NEAR]: { cruiser: 1 } } }) };
};

describe('technology:dt2 Dimensional Tear II', () => {
  // "PRODUCTION 7"
  // Checks: a Dimensional Tear II on a planet of 1 resource produces seven units; no warning.
  // Why the default limit does not apply: the upgrade changes the number itself (a `modify` of the dock's Production):
  // it is 7, not the planet's resources plus a value as for Space Dock II (79.1), which would give 5 here.
  test('technology:dt2 produces seven units whatever its planet\'s resources', () => {
    const table = build({ infantry: 7 });
    quote(table.pack, id, 'PRODUCTION 7');
    expectNone(warningsOf(table, table.entry), 'productionOver');
  });

  // Checks: the eighth unit is over, and the warning names the value 7.
  // Why the check is NOT redundant here: 7 is the limit of the dock, not its absence.
  test('technology:dt2 the eighth unit is over the Production of 7', () => {
    const table = build({ infantry: 8 });
    const warnings = warningsOf(table, table.entry);
    expectStanding(warnings, 'productionOver');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 7, count: 8 });
  });

  // LRR 79.1 with Space Dock I: "PRODUCTION X ... 2 more than the resource value of this planet".
  // Checks: without the upgrade the dock on a planet of 1 resource produces three units.
  // Why the check is NOT redundant here: the Cabal's dock of level I is counted as a Space Dock I (the faction's own
  // Dimensional Tear I is a unit of the sheet, not a component of the catalogue).
  test('technology:dt2 without it the dock is of level I', () => {
    const table = build({ infantry: 4 }, 'h2', []);
    expect(warningsOf(table, table.entry).find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 3, count: 4 });
  });

  // "Up to 12 fighters in this system do not count against your ships' capacity."
  // Checks: twelve fighters in the dock's system and a cruiser without capacity: no capacity warning.
  // Why the default limit does not apply: a space dock keeps 3 fighters apart from capacity (Space Dock I and II); the
  // Dimensional Tear II keeps 12, a different number (a `modify`), so nothing is waived: the check finds nothing.
  test('technology:dt2 keeps twelve fighters in its system apart from capacity', () => {
    const table = homecoming(12);
    quote(table.pack, id, 'Up to 12 fighters in this system do not count against your ships\' capacity');
    expectNone(warningsOf(table, table.entry), 'capacitySystem');
  });

  // Checks: the thirteenth fighter counts, and the warning names a load of 1.
  // Why the check is NOT redundant here: the card says "up to 12".
  test('technology:dt2 the thirteenth fighter counts against capacity', () => {
    const table = homecoming(13);
    expect(warningsOf(table, table.entry).find(w => w.code === 'capacitySystem')?.params).toMatchObject({ load: 1, capacity: 0 });
  });

  // Checks: without the upgrade the dock keeps three, so nine of the twelve fighters are a load.
  // Why the check is NOT redundant here: the 12 are the upgrade's.
  test('technology:dt2 without it the dock keeps three fighters', () => {
    const table = homecoming(12, []);
    expect(warningsOf(table, table.entry).find(w => w.code === 'capacitySystem')?.params).toMatchObject({ load: 9, capacity: 0 });
  });

  // Checks: fighters in a system without the dock count as always.
  // Why the check is NOT redundant here: "in this system" is the dock's system only.
  test('technology:dt2 fighters elsewhere count against capacity', () => {
    const entry = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const table = cabal({ entry, dock: 'h1', units: { [HOME]: { cruiser: 1 }, [NEAR]: { fighter: 4 } } });
    expectStanding(warningsOf(table, entry), 'capacitySystem');
  });

  // "This system is a gravity rift; your ships do not roll for this gravity rift." Vuil'raith, Dimensional Tear note 2:
  //  "If a ship moves through or out of multiple gravity rifts ... each instance will provide a +1 to movement."
  // Checks: a cruiser (move 2) leaves the dock's system and reaches a system three away; no speed warning.
  // Why the check is redundant here: the system of the dock is a gravity rift, which adds 1 to the move of a ship that
  // leaves it (41.3); the roll for removal is not simulated, and the Cabal do not roll for it anyway.
  test('technology:dt2 the dock\'s system is a gravity rift: a ship leaving it moves one system further', () => {
    const entry = tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
    const table = cabal({ entry, dock: 'h1', units: { [HOME]: { cruiser: 1 } } });
    quote(table.pack, id, 'This system is a gravity rift');
    expectNone(warningsOf(table, entry), 'speedShort');
  });

  // LRR 58.2: a ship moves no further than its move value.
  // Checks: without the upgrade the same flight is short.
  // Why the check is NOT redundant here: the faction's Dimensional Tear I is a rift too, but it is a unit of the sheet
  // the plan does not know; only the technology is a component.
  test('technology:dt2 without it the same flight is short of speed', () => {
    const entry = tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
    const table = cabal({ entry, dock: 'h1', units: { [HOME]: { cruiser: 1 } }, technologies: [] });
    expectStanding(warningsOf(table, entry), 'speedShort');
  });

  test('technology:dt2 is a passive unit upgrade whose dock produces 7', () => {
    const { pack } = build({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.productionValue?.(3, { structure: 'spacedock', planetId: 'h2' })).toBe(7);
  });
});
