import { describe, expect, test } from 'vitest';
import type { Game, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectStanding, expectWaived, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './ie';

/**
 * A carrier with two infantry flies from the next system into the target, lands them on t1 (2 resources) unless
 * `land` is false, and produces `units` there, where there is no space dock; h1 (3 resources) pays.
 */
const invade = (units: UnitCounts, options: { technologies?: string[]; land?: boolean; game?: Partial<Game> } = {}) => {
  const move = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
    landings: options.land === false ? [] : [{ planetId: 't1', units: { infantry: 2 } }],
    production: units, payment: { planets: ['h1'], tradeGoods: 0 },
  });
  const table = bench({
    faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 2 } }, start: { technologies: options.technologies ?? [id] }, entries: [move],
    game: { planetControl: { h1: 'me' }, ...options.game },
  });
  return { move, ...table };
};

describe('technology:ie Integrated Economy', () => {
  // "After you gain control of a planet, you may produce any number of units on that planet that have a combined cost
  //  equal to or less than that planet's resource value."
  // Checks: t1 (2 resources) is taken by the landing, and two infantry (cost 1) are produced there with no space dock;
  // the warning that nothing in the system has PRODUCTION is listed and lifted by the card.
  // Why the check is redundant here: LRR 67.3 has a player produce through their units' Production abilities, and the
  // card produces on the planet just taken without any.
  test('technology:ie produces on a planet just taken without a space dock: the warning is waived', () => {
    const table = invade({ infantry: 2 });
    quote(table.pack, id, 'After you gain control of a planet, you may produce any number of units on that planet');
    expectWaived(warningsOf(table, table.move), 'noProduction', id);
  });

  // Ruling (Integrated Economy 4): "A player may produce ships with Integrated Economy, unless another player has ships
  //  in the space area of that planet's system."
  // Checks: a destroyer and two infantry (cost 2, the resources of t1) are produced, and the destroyer stands in space.
  // Why the check is redundant here: the combined cost is within the planet's resources, ships included.
  test('technology:ie may produce ships too, up to the planet\'s resources', () => {
    const table = invade({ destroyer: 1, infantry: 2 });
    expectWaived(warningsOf(table, table.move), 'noProduction', id);
    expect(endOf(table).systems[TARGET]).toMatchObject({ destroyer: 1 });
  });

  // "... a combined cost equal to or less than that planet's resource value."
  // Checks: a cruiser and a destroyer (cost 3) on t1 (2 resources) are warned of.
  // Why the check is NOT redundant here: the combined cost is beyond what the card allows.
  test('technology:ie a combined cost beyond the planet\'s resources still stands', () => {
    const table = invade({ cruiser: 1, destroyer: 1 });
    expectStanding(warningsOf(table, table.move), 'noProduction');
  });

  // "After you gain control of a planet ..."
  // Checks: t1 is mine before the action and nothing lands; the production is warned of.
  // Why the check is NOT redundant here: no control was gained, so the card's moment never comes.
  test('technology:ie a planet already controlled gives nothing', () => {
    const table = invade({ infantry: 2 }, { land: false, game: { planetControl: { h1: 'me', t1: 'me' } } });
    expectStanding(warningsOf(table, table.move), 'noProduction');
  });

  // LRR 67.3: "When a player produces a unit through the use of their units' Production abilities during a tactical
  //  action, that player follows the rules of the Production ability to determine where in the active system the units
  //  can be placed."
  // Checks: without the card the production on t1 is warned of.
  // Why the check is NOT redundant here: nothing this player holds produces without a unit with PRODUCTION.
  test('technology:ie not held: the production without a space dock stands', () => {
    const table = invade({ infantry: 2 }, { technologies: [] });
    expectStanding(warningsOf(table, table.move), 'noProduction');
  });

  // Ruling (Integrated Economy 1): "The produced units must be paid for."
  // Checks: the infantry produced through the card still cost their resource; paid with nothing they are short.
  // Why the check is NOT redundant here: the card lifts the need of a space dock, not the cost.
  test('technology:ie the units are still paid for', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }],
      production: { infantry: 2 }, payment: { planets: [], tradeGoods: 0 },
    });
    const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 2 } }, start: { technologies: [id] }, entries: [move] });
    expectStanding(warningsOf(table, move), 'shortResources');
  });

  test('technology:ie is a passive effect that waives the need of a unit with PRODUCTION', () => {
    const { pack } = invade({});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['noProduction']);
  });
});
