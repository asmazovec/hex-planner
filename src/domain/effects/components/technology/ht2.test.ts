import { describe, expect, test } from 'vitest';
import structureAboard from '../../../rules/codes/structureAboard';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './ht2';

/** The Titans activate their home system and produce `units` there, where h1 has `pds` PDS and no space dock. */
const build = (units: UnitCounts, pds = 1, technologies: string[] = [id]) => {
  const entry = tactical(HOME, { production: units });
  return { entry, ...bench({ faction: 'titans', expansions: ['pok'], start: { technologies }, entries: [entry], game: { pds: { h1: pds } } }) };
};

describe('technology:ht2 Hel-Titan II', () => {
  // "PLANETARY SHIELD, SPACE CANNON 5, SUSTAIN DAMAGE, PRODUCTION 1"
  // Checks: a Hel-Titan II on a home planet without a space dock produces one infantry; no warning that nothing in
  // the system has Production.
  // Why the check is redundant here: LRR 67.1 asks for a unit with Production in the system; the upgraded PDS of the
  // Titans has PRODUCTION 1 itself, so a space dock is not needed.
  test.fails('technology:ht2 a Hel-Titan produces without a space dock', () => {
    const table = build({ infantry: 1 });
    quote(table.pack, id, 'PRODUCTION 1');
    expectNone(warningsOf(table, table.entry), 'noProduction');
    expectNone(warningsOf(table, table.entry), 'productionOver');
  });

  // Checks: its value is 1: two infantry are over it, and the warning names the value 1.
  // Why the check is NOT redundant here: PRODUCTION 1 is a limit like any other (67.2); it is not the planet's
  // resources plus a value, as a space dock's is.
  test.fails('technology:ht2 a Hel-Titan produces one unit, not two', () => {
    const table = build({ infantry: 2 });
    expect(warningsOf(table, table.entry).find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 1, count: 2 });
  });

  // Titans of Ul, Hel-Titan note 2: "When multiple units use their Production ability, the Production value is pooled."
  // Checks: two Hel-Titans on one planet produce two infantry together.
  // Why the check is redundant here: each Hel-Titan adds its 1 to the system's Production.
  test.fails('technology:ht2 two Hel-Titans pool their Production', () => {
    const table = build({ infantry: 2 }, 2);
    expectNone(warningsOf(table, table.entry), 'productionOver');
    expectNone(warningsOf(table, table.entry), 'noProduction');
  });

  // Hel-Titan I has no Production; LRR 67.1.
  // Checks: without the upgrade the PDS produces nothing, and the system is warned of.
  // Why the check is NOT redundant here: only level II has PRODUCTION 1.
  test('technology:ht2 without it a PDS gives no Production', () => {
    const table = build({ infantry: 1 }, 1, []);
    expectStanding(warningsOf(table, table.entry), 'noProduction');
  });

  // "This unit is treated as both a structure and a ground force. It cannot be transported."
  // Checks: a Hel-Titan taken aboard a ship is warned of, upgrade or not.
  // Why the check is NOT redundant here: the card repeats LRR 85.3 for its unit; nothing lifts it.
  test('technology:ht2 a Hel-Titan cannot be transported', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }, { from: 'h1', units: {}, structures: { pds: 1 } }] });
    const table = bench({ faction: 'titans', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, start: { technologies: [id] }, entries: [move], game: { pds: { h1: 1 } } });
    quote(table.pack, id, 'It cannot be transported.');
    expectStanding(warningsOf(table, move), structureAboard.code);
  });

  test.todo('technology:ht2 a Hel-Titan counts as a ground force for the control of its planet: control by ground forces is not counted apart from landings');

  test.fails('technology:ht2 is a passive unit upgrade that gives a PDS a Production value', () => {
    const { pack } = build({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.productionValue?.(0, { structure: 'pds', planetId: 'h1' })).toBe(1);
  });
});
