import { describe, expect, test } from 'vitest';
import type { Payment, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NO_PAYMENT, quote, tactical, warningsOf } from '../kit';
import { id } from './helios2';

/** A tactical action in the home system that builds `units` with the dock on h1 (resources 3), paying with `pay`. */
const build = (faction: string, technologies: string[], units: UnitCounts, pay: Payment = NO_PAYMENT, ships: UnitCounts = {}) => {
  const move = tactical(HOME, { production: units, payment: pay });
  return { move, ...bench({ faction, expansions: ['pok', 'te'], units: { [HOME]: ships }, start: { technologies }, game: { docks: ['h1'] }, entries: [move] }) };
};
const over = (table: ReturnType<typeof build>) => warningsOf(table, table.move).find(w => w.code === 'productionOver')?.params;

describe('technology:helios2 4X41C "Helios" V2', () => {
  // "This unit's PRODUCTION value is equal to 4 more than the resource value of this planet. The resource value of this
  //  planet is increased by 2." Ruling (Last Bastion, 4X31C "Helios" 1): the Production value is calculated from the
  //  modified resource value of the planet.
  // Checks: the dock on h1 (resources 3) produces 3 + 2 + 4 = 9 units: nine infantry make no productionOver warning.
  // Why the default limit does not apply: Space Dock II gives resources + 4 = 7 (79.1); Helios raises the resources
  // themselves, so the check runs against 9. A modify, not a waiver: nothing is listed as waived.
  test('technology:helios2 produces 4 more than the planet\'s resources raised by 2: nine units on a planet of 3', () => {
    const table = build('bastion', [id], { infantry: 9 });
    quote(table.pack, id, 'This unit\'s PRODUCTION value is equal to 4 more than the resource value of this planet.');
    quote(table.pack, id, 'The resource value of this planet is increased by 2.');
    expectNone(warningsOf(table, table.move), 'productionOver');
  });

  // Checks: the tenth unit is beyond the raised limit, and the warning names the value of 9.
  // Why the check is NOT redundant here: Helios raises the Production value, it does not remove it.
  test('technology:helios2 still warns of a tenth unit, against the value of nine', () => {
    const table = build('bastion', [id], { infantry: 10 });
    expectStanding(warningsOf(table, table.move), 'productionOver');
    expect(over(table)).toMatchObject({ value: 9, count: 10 });
  });

  // "The resource value of this planet is increased by 2."
  // Checks: nine infantry cost 5 (two for 1, 4.5 rounded up); h1 alone pays them: 3 printed + 2.
  // Why the check is redundant here: the payment counts the printed resources of h1 (3); Helios makes them 5.
  test('technology:helios2 raises the resources of the dock\'s planet by 2 when it is spent', () => {
    const table = build('bastion', [id], { infantry: 9 }, { planets: ['h1'], tradeGoods: 0 });
    expectNone(warningsOf(table, table.move), 'shortResources');
  });

  // Checks: a planet without the dock keeps its printed resources: h2 (1) pays 1 of the 5 needed with h1 not spent.
  // Why the check is NOT redundant here: "this planet" is the planet of the dock only.
  test('technology:helios2 does not raise a planet without the dock', () => {
    const table = build('bastion', [id], { infantry: 9 }, { planets: ['h2'], tradeGoods: 0 });
    expectStanding(warningsOf(table, table.move), 'shortResources');
  });

  // LRR 79.1 and the Space Dock II card: Production is the planet's resources plus 4.
  // Checks: another faction with the common Space Dock II produces 7 on h1, and the eighth unit is warned of.
  // Why the check is NOT redundant here: Helios is the Last Bastion's own upgrade; Space Dock II does not raise the
  // planet's resources.
  test('technology:helios2 is the Last Bastion\'s own: Space Dock II of another faction produces resources + 4', () => {
    const table = build('sol', ['technology:sd2'], { infantry: 8 });
    expect(over(table)).toMatchObject({ value: 7, count: 8 });
  });

  // Checks: the Last Bastion without the upgrade has Space Dock I: resources + 2 = 5 on h1.
  // Why the check is NOT redundant here: the upgrade must be researched; it is not printed on the faction sheet.
  test('technology:helios2 not researched, the dock produces resources + 2', () => {
    const table = build('bastion', [], { infantry: 6 });
    expect(over(table)).toMatchObject({ value: 5, count: 6 });
  });

  // "Up to 3 fighters in this system do not count against your ships' capacity."
  // Checks: a carrier (capacity 4) and seven fighters built at home stand there without a capacity warning.
  // Why the check is redundant here: every space dock keeps 3 fighters apart from the capacity (79 note 2), which the
  // count already does for Space Dock I and II alike (`dockFighterRoom`): nothing new is needed.
  test('technology:helios2 keeps three fighters apart from the capacity, as every dock does', () => {
    const table = build('bastion', [id], { fighter: 7 }, NO_PAYMENT, { carrier: 1 });
    quote(table.pack, id, 'Up to 3 fighters in this system do not count against your ships\' capacity.');
    expectNone(warningsOf(table, table.move), 'capacitySystem');
  });

  // Checks: the eighth fighter is beyond the carrier and the three the dock keeps.
  // Why the check is NOT redundant here: "Up to 3", not every fighter.
  test('technology:helios2 an eighth fighter beyond the carrier and the dock is warned of', () => {
    const table = build('bastion', [id], { fighter: 8 }, NO_PAYMENT, { carrier: 1 });
    expectStanding(warningsOf(table, table.move), 'capacitySystem');
  });

  test('technology:helios2 is a passive effect that changes the Production value and the resources of its planet', () => {
    const { pack } = build('bastion', [id], {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(Object.keys(effect(pack, id).modify ?? {}).sort()).toEqual(['planetResources', 'productionValue']);
  });
});
