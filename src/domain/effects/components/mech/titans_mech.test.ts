import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, HOME, quote, secondary, warningsOf } from '../kit';
import { id } from './titans_mech';

/** Construction's secondary that puts `units` on the home planet h1 instead of a structure. */
const instead = (units: UnitCounts, faction = 'titans') => {
  const entry = secondary(CARD.construction, { production: { systemId: HOME, units, ground: { h1: units } } });
  return { entry, ...bench({ faction, expansions: ['pok'], entries: [entry] }) };
};

describe('mech:titans_mech Hecatoncheires', () => {
  // "DEPLOY: When you would place a PDS on a planet, you may place 1 mech and 1 infantry on that planet instead."
  // Checks: Construction's secondary places one mech and one infantry on h1 instead of a PDS; the warning that the
  // card places units is listed and lifted by the mech, and both units stand on h1.
  // Why the check is redundant here: LRR 24 (Construction) places structures only, which the replay checks
  // (`constructionUnits`); the Titans' mech replaces the PDS with exactly these two units.
  test('mech:titans_mech one mech and one infantry instead of a PDS: the warning is waived and the units stand on the planet', () => {
    const table = instead({ mech: 1, infantry: 1 });
    quote(table.pack, id, 'you may place 1 mech and 1 infantry on that planet instead');
    expectWaived(warningsOf(table, table.entry), 'constructionUnits', id);
    expect(endOf(table).ground.h1).toMatchObject({ mech: 1, infantry: 1 });
  });

  // Checks: two infantry with the mech are one too many.
  // Why the check is NOT redundant here: the deploy gives 1 mech and 1 infantry for each PDS, nothing more.
  test('mech:titans_mech a second infantry stands', () => {
    const table = instead({ mech: 1, infantry: 2 });
    expectStanding(warningsOf(table, table.entry), 'constructionUnits');
  });

  // Checks: a ship placed by Construction is warned of for the Titans too.
  // Why the check is NOT redundant here: the deploy places only a mech and an infantry.
  test('mech:titans_mech a ship placed by Construction stands', () => {
    const table = instead({ cruiser: 1 });
    expectStanding(warningsOf(table, table.entry), 'constructionUnits');
  });

  // LRR 24 (Construction): the secondary places 1 PDS or 1 space dock.
  // Checks: another faction's mech and infantry placed by Construction are warned of.
  // Why the check is NOT redundant here: the deploy is printed on the Titans' mech alone.
  test('mech:titans_mech another faction placing a mech by Construction stands', () => {
    const table = instead({ mech: 1, infantry: 1 }, 'sol');
    expectStanding(warningsOf(table, table.entry), 'constructionUnits');
  });

  test.todo('mech:titans_mech deploy instead of a PDS placed by Awaken: sleeper tokens are not modelled');

  test('mech:titans_mech is a passive effect that waives the units placed by Construction', () => {
    const { pack } = instead({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['constructionUnits']);
  });
});
