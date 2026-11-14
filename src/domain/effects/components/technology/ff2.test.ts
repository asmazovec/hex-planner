import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './ff2';

const flight = (units: UnitCounts, technologies: string[] = []) => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
  return { move, ...bench({ faction: 'hacan', units: { [HOME]: units }, start: { technologies }, entries: [move] }) };
};

describe('technology:ff2 Fighter II', () => {
  // "This unit may move without being transported."
  // Checks: two Fighter II fly on their own to the next system; no capacity warning is made.
  // Why the check is redundant here: the capacity check (16.1) counts fighters as load because they cannot move by
  // themselves; a fighter with a move value is not transported, so it is no load (a `modify` of its move).
  test('technology:ff2 fighters fly without a carrier: no capacity warning', () => {
    const table = flight({ fighter: 2 }, [id]);
    quote(table.pack, id, 'This unit may move without being transported.');
    expectNone(warningsOf(table, table.move), 'capacityGroup');
  });

  // LRR 16.1 and the fighter's printed move "-".
  // Checks: Fighter I in the same flight are load with no ship to carry them.
  // Why the check is NOT redundant here: without the upgrade a fighter has no move value.
  test('technology:ff2 Fighter I cannot fly alone: the capacity warning stands', () => {
    const table = flight({ fighter: 2 });
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // "Fighters in excess of your ships' capacity count against your fleet pool."
  // Checks: three cruisers and one Fighter II with no place on board are four ships against a fleet pool of 3.
  // Why this check is new with the component: it is a limit the upgrade itself prints; Fighter I are never ships.
  test('technology:ff2 a fighter beyond the capacity counts against the fleet pool', () => {
    const two = flight({ cruiser: 3, fighter: 1 }, [id]);
    expect(warningsOf(two, two.move).find(w => w.code === 'fleetPool')?.params).toMatchObject({ ships: 4, fleet: 3 });
    const one = flight({ cruiser: 3, fighter: 1 });
    expectNone(warningsOf(one, one.move), 'fleetPool');
  });

  // Checks: a fighter that has a place on board is not a ship: a carrier and two Fighter II are one ship.
  // Why the check is NOT redundant here: only fighters "in excess of your ships' capacity" count.
  test('technology:ff2 fighters within the capacity do not count against the fleet pool', () => {
    const table = flight({ carrier: 1, cruiser: 2, fighter: 4 }, [id]);
    expectNone(warningsOf(table, table.move), 'fleetPool');
  });

  test('technology:ff2 is a passive effect that gives the fighter a move', () => {
    const { pack } = flight({ fighter: 1 }, [id]);
    const found = effect(pack, id);
    expect(found.tier).toBe('passive');
    expect(found.modify?.speed?.(0, { faction: 'hacan', unit: 'fighter' })).toBe(2);
  });
});
