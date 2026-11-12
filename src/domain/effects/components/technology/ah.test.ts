import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, FAR, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './ah';

/** A production in the home system, where my PDS stands on h2 and no space dock is anywhere. */
const build = (production: UnitCounts, technologies: string[] = [id], ground: Record<string, UnitCounts> = { h2: production }) => {
  const move = tactical(HOME, { production, productionGround: ground });
  return { move, ...bench({ faction: 'argent', expansions: ['pok'], start: { technologies }, entries: [move], game: { pds: { h2: 1 } } }) };
};

const RIVAL = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** An opponent's destroyer flies from FAR to NEAR through the target, where my PDS stands on t1. */
const passage = (technologies: string[]) => {
  const theirs = tactical(NEAR, { moves: [{ from: FAR, units: { destroyer: 1 }, via: [TARGET] }] }, { owner: RIVAL.id });
  return {
    theirs, ...bench({
      faction: 'argent', expansions: ['pok'], start: { technologies }, entries: [theirs],
      game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { destroyer: 1 } } }, pds: { t1: 1 }, planetControl: { t1: 'me' } },
    }),
  };
};

describe('technology:ah Aerie Hololattice', () => {
  // "Each planet that contains 1 or more of your structures gains the PRODUCTION 1 ability as if it were a unit."
  // Checks: the home planet h2 with my PDS produces one infantry, placed on h2, with no space dock in the system: no
  // warning of a missing producing unit, of the value or of the placement.
  // Why the check is redundant here: 67/68 ask for a unit with Production; with this card the planet itself is one, of
  // value 1, and its ground forces are placed on it (Argent, Aerie Hololattice note 1).
  test.fails('technology:ah a planet with my PDS produces one unit without a space dock', () => {
    const table = build({ infantry: 1 });
    quote(table.pack, id, 'gains the PRODUCTION 1 ability as if it were a unit');
    const warnings = warningsOf(table, table.move);
    expectNone(warnings, 'noProduction');
    expectNone(warnings, 'productionOver');
    expectNone(warnings, 'productionPlace');
    expect(endOf(table).ground.h2).toEqual({ infantry: 1 });
  });

  // Checks: two units are beyond the value of 1, and the warning names it.
  // Why the check is NOT redundant here: the planet produces as a unit of PRODUCTION 1, not without a limit.
  test.fails('technology:ah a second unit is beyond PRODUCTION 1', () => {
    const table = build({ infantry: 1, cruiser: 1 });
    expect(warningsOf(table, table.move).find(w => w.code === 'productionOver')?.params).toMatchObject({ value: 1, count: 2 });
  });

  // LRR 67.3 with 68.1: production uses the Production abilities of units in the active system.
  // Checks: without the technology a planet with a PDS produces nothing.
  // Why the check is NOT redundant here: a PDS has no Production; only this card gives its planet one.
  test('technology:ah without it a planet with a PDS has no Production', () => {
    const table = build({ infantry: 1 }, []);
    expectStanding(warningsOf(table, table.move), 'noProduction');
  });

  // "Other players cannot move ships through systems that contain your structures."
  // Checks: an opponent's destroyer flying through the target, where my PDS stands, is warned of in the opponent's entry.
  // Why the check is NOT redundant here: this is a limit the card adds for the other players (58.3.2 stops a route at
  // other players' ships only); nothing lifts it.
  test.fails('technology:ah an opponent\'s route through a system with my structure is blocked', () => {
    const table = passage([id]);
    quote(table.pack, id, 'Other players cannot move ships through systems that contain your structures');
    expectStanding(warningsOf(table, table.theirs), 'routeBlocked');
  });

  // LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
  // Checks: without the technology the same route is free.
  // Why the check is NOT redundant here: a structure alone blocks nothing by the rules.
  test('technology:ah without it an opponent flies through a system with my structure', () => {
    const table = passage([]);
    expectNone(warningsOf(table, table.theirs), 'routeBlocked');
  });

  test.fails('technology:ah is a passive effect that changes the count', () => {
    const { pack } = build({});
    expect(effect(pack, id).tier).toBe('passive');
  });

  test.todo('technology:ah a planet with my space dock produces one more as well (dock and planet both have PRODUCTION): to be settled against a ruling before it is counted');
});
