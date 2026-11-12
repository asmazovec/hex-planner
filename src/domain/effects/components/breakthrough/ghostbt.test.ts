import { describe, expect, test } from 'vitest';
import type { StartHoldings, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './ghostbt';

/** An alpha wormhole in NEAR, which has no planet and so no space dock. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** A production in `where` with nothing paid; `ships` stand there before it. */
const build = (where: string, production: UnitCounts, { ships = true, start = { breakthrough: 'held' } as StartHoldings } = {}) => {
  const entry = tactical(where, { production });
  return { entry, ...bench({ faction: 'ghost', expansions: ['te'], units: ships ? { [where]: { cruiser: 1 } } : {}, start, entries: [entry], game: { map: MAP } }) };
};

describe('breakthrough:ghostbt Particle Synthesis', () => {
  // "Each wormhole in a system that contains your ships gains PRODUCTION 1 as if it were a unit you control."
  // Checks: a destroyer is produced in the alpha system NEAR, where a Creuss cruiser stands and no space dock is; the
  // warning that no unit has Production there is listed and lifted.
  // Why the check is redundant here: 67/79 ask for a unit with Production in the system; the breakthrough makes the
  // wormhole one.
  test('breakthrough:ghostbt a wormhole in a system with my ships produces: the warning is waived', () => {
    const table = build(NEAR, { destroyer: 1 });
    quote(table.pack, id, 'Each wormhole in a system that contains your ships gains PRODUCTION 1 as if it were a unit you control.');
    expectWaived(warningsOf(table, table.entry), 'noProduction', id);
  });

  // "Reduce the combined cost of units you produce in systems that contain wormholes by 1 for each wormhole in that system."
  // Checks: the destroyer (cost 1) costs nothing in a system with one wormhole: nothing paid and no shortfall.
  // Why the default cost does not apply: the combined cost of the production is 1 less, a change of the number (a new
  // point of the count), not a waiver.
  test.fails('breakthrough:ghostbt the production in a wormhole system costs 1 less', () => {
    const table = build(NEAR, { destroyer: 1 });
    quote(table.pack, id, 'Reduce the combined cost of units you produce in systems that contain wormholes by 1 for each wormhole in that system.');
    expectNone(warningsOf(table, table.entry), 'shortResources');
  });

  // "... gains PRODUCTION 1"
  // Checks: two destroyers in a system with one wormhole are beyond its PRODUCTION 1.
  // Why the check is NOT redundant here: one wormhole produces one unit (Creuss notes, Particle Synthesis 1: each
  // wormhole gives its own value).
  test.fails('breakthrough:ghostbt one wormhole produces one unit: a second is warned of', () => {
    const table = build(NEAR, { destroyer: 2 });
    const warnings = warningsOf(table, table.entry);
    expectWaived(warnings, 'noProduction', id);
    expectStanding(warnings, 'productionOver');
  });

  // "... in a system that contains your ships"
  // Checks: the alpha system with none of my ships has no Production.
  // Why the check is NOT redundant here: the wormhole produces only where the player's ships are.
  test('breakthrough:ghostbt a wormhole without my ships does not produce', () => {
    const table = build(NEAR, { destroyer: 1 }, { ships: false });
    expectStanding(warningsOf(table, table.entry), 'noProduction');
  });

  // Checks: a system with no wormhole has no Production from the breakthrough.
  // Why the check is NOT redundant here: there is no wormhole to produce.
  test('breakthrough:ghostbt a system without a wormhole does not produce', () => {
    const table = build(FAR, { destroyer: 1 });
    expectStanding(warningsOf(table, table.entry), 'noProduction');
  });

  // LRR 67.1, 79.4.
  // Checks: without the breakthrough the same production has no Production and is not paid.
  // Why the check is NOT redundant here: the breakthrough is not held.
  test('breakthrough:ghostbt not held, the wormhole does not produce and the cost stands', () => {
    const table = build(NEAR, { destroyer: 1 }, { start: {} });
    const warnings = warningsOf(table, table.entry);
    expectStanding(warnings, 'noProduction');
    expectStanding(warnings, 'shortResources');
  });

  // Checks: the breakthrough is in force while held: a passive effect that lifts the two checks of production.
  test('breakthrough:ghostbt is a passive effect that waives the production checks', () => {
    const { pack } = build(NEAR, {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code).sort()).toEqual(['noProduction', 'productionOver']);
  });
});
