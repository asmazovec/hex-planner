import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './lw2';

/**
 * A production in the target system, where my one infantry stands on t1 (which I control) and no space dock is: the
 * Letani Warrior is the only unit with PRODUCTION there.
 */
const build = (faction: string, production: UnitCounts, technologies: string[]) => {
  const move = tactical(TARGET, { production, productionGround: { t1: production } });
  return {
    move, ...bench({
      faction, expansions: ['pok'], start: { technologies }, entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), move],
      game: { planetControl: { t1: 'me' } },
    }),
  };
};

describe('technology:lw2 Letani Warrior II', () => {
  // "PRODUCTION 2"
  // Checks: one Letani Warrior II on t1 produces two infantry in its system without a space dock: neither the lack of a
  // producing unit nor the Production value is warned of.
  // Why the check is redundant here: 67/68 ask for a unit with Production, and for the Arborec the infantry is one,
  // of value 2 with this upgrade (68.1); the replay counts space docks only.
  test('technology:lw2 a Letani Warrior II produces two infantry without a space dock', () => {
    const table = build('arborec', { infantry: 2 }, [id]);
    quote(table.pack, id, 'PRODUCTION 2');
    const warnings = warningsOf(table, table.move);
    expectNone(warnings, 'noProduction');
    expectNone(warnings, 'productionOver');
    expectNone(warnings, 'productionPlace');
  });

  // Checks: a third infantry is beyond the Production value of 2.
  // Why the check is NOT redundant here: the upgrade sets the value to 2, it does not lift the limit (68.1).
  test('technology:lw2 a third unit is beyond the Production value of 2', () => {
    const table = build('arborec', { infantry: 3 }, [id]);
    const warnings = warningsOf(table, table.move);
    expectStanding(warnings, 'productionOver');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 2, count: 3 });
  });

  // Checks: without the upgrade the Letani Warrior I has PRODUCTION 1, so two infantry are one beyond it.
  // Why the check is NOT redundant here: the value of 2 is this card's; level I produces one.
  test('technology:lw2 without it a Letani Warrior I produces one unit', () => {
    const table = build('arborec', { infantry: 2 }, []);
    const warnings = warningsOf(table, table.move);
    expectNone(warnings, 'noProduction');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 1, count: 2 });
  });

  // LRR 68.1: "A unit's Production ability, which is presented on a faction sheet or unit upgrade technology card, is
  //  always followed by a value."
  // Checks: another faction's infantry has no Production, so a production there has no producing unit.
  // Why the check is NOT redundant here: the Production of an infantry is printed on the Arborec sheet only.
  test('technology:lw2 another faction\'s infantry produces nothing', () => {
    const table = build('sol', { infantry: 2 }, ['technology:inf2']);
    expectStanding(warningsOf(table, table.move), 'noProduction');
  });

  // "Cost 1(x2), Combat 7"
  // Checks: the upgrade is the generated level II (its cost) and lifts nothing.
  test('technology:lw2 is a passive effect with its generated numbers and no waiver', () => {
    const { pack } = build('arborec', {}, [id]);
    quote(pack, id, 'Cost 1(x2), Combat 7');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.unitCost).toBeDefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('technology:lw2 a destroyed Letani Warrior II comes back on a 6 or more: the plan rolls no dice');
});
