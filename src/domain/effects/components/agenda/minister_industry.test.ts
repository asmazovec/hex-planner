import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, expectStanding, expectWaived, HOME, quote, TARGET, primary, warningsOf } from '../kit';
import { id } from './minister_industry';

/**
 * The check this law lifts does not exist yet: a strategy card that produces nothing (Construction) entered with a
 * production. Pass 2 adds it as `src/domain/rules/codes/productionNotAllowed.ts` (LRR 67.1, step production).
 */
const CODE = 'productionNotAllowed' as AnyWarningCode;

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** Construction's primary places a space dock on Home Two and, in the same entry, produces `units` in `systemId`. */
const construct = (units: UnitCounts, systemId = HOME) =>
  primary(4, { structures: [{ kind: 'spacedock', planetId: 'h2' }], production: { systemId, units }, payment: { planets: ['h1'], tradeGoods: 0 } });
const table = (entry: Entry, inPlay: boolean) =>
  bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: inPlay ? [law(), entry] : [entry] });

describe('agenda:minister_industry Minister of Industry', () => {
  // "When the owner of this card places a space dock in a system, their units in that system may use their
  //  PRODUCTION abilities."
  // Checks: the owner places a space dock with Construction and produces two fighters there in the same entry; the
  // warning that the card gives no production is listed and lifted by the law.
  // Why the check is redundant here: units produce by their PRODUCTION ability in the production step of a tactical
  // action (67.1, 89.5) and Construction only places structures (4.2); the law lets the units of that system produce
  // when the dock is placed.
  test('agenda:minister_industry lets the units of the system produce when a space dock is placed', () => {
    const entry = construct({ fighter: 2 });
    const minister = table(entry, true);
    quote(minister.pack, id, 'their units in that system may use their PRODUCTION abilities');
    expectWaived(warningsOf(minister, entry), CODE, id);
  });

  // LRR 67.1: "Units with the PRODUCTION ability can produce units during the 'Production' step of a tactical action."
  // Checks: without the law the same production on Construction is warned of.
  // Why the check is NOT redundant here: the law is not in play.
  test('agenda:minister_industry not in play: a production on Construction is warned of', () => {
    const entry = construct({ fighter: 2 });
    expectStanding(warningsOf(table(entry, false), entry), CODE);
  });

  // Checks: the production in another system than the one of the dock placed is warned of, law or not.
  // Why the check is NOT redundant here: the law speaks of the units "in that system", the dock's.
  test('agenda:minister_industry does not let another system produce', () => {
    const entry = construct({ fighter: 2 }, TARGET);
    expectStanding(warningsOf(table(entry, true), entry), CODE);
  });

  // Minister of Industry note 1 and LRR 67.2: the units "use their PRODUCTION abilities", so their value limits them.
  // Checks: the new dock on Home Two (1 resource + 2) produces 3 units; four fighters are over that value.
  // Why the check is NOT redundant here: the law allows the ability, it does not raise its value.
  test('agenda:minister_industry the production is limited by the PRODUCTION value', () => {
    const entry = construct({ fighter: 4 });
    const warnings = warningsOf(table(entry, true), entry);
    expectStanding(warnings, 'productionOver');
    expect(warnings.find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 3, count: 4 });
  });

  // Minister of Industry note 2: "The produced units must be paid for."
  // Checks: two fighters (1 resource) produced on Construction with nothing paid: the shortfall stands with the law.
  // Why the check is NOT redundant here: the law gives the ability, not the units: their cost is owed.
  test('agenda:minister_industry the units produced are still paid for', () => {
    const entry = primary(4, { structures: [{ kind: 'spacedock', planetId: 'h2' }], production: { systemId: HOME, units: { fighter: 2 } } });
    expectStanding(warningsOf(table(entry, true), entry), 'shortResources');
  });

  test('agenda:minister_industry is a passive effect that waives the production of a card that produces nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
