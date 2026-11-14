import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, expectStanding, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './keleresherokuuasi';

/** Three cruisers fly into the target, where I control Target One. */
const attack = (): Entry => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 3 }, via: [NEAR] }] });
const keleres = (...entries: Entry[]) => ({
  last: entries[entries.length - 1],
  ...bench({ faction: 'keleresa', expansions: ['pok'], units: { [HOME]: { cruiser: 3 } }, start: { leaders: { [id]: 'unlocked' } }, entries, game: { planetControl: { t1: 'me' } } }),
});

describe('leader:keleresherokuuasi Kuuasi Aun Jalatai', () => {
  // "At the start of a round of of space combat in a system that contains a planet you control: Place your flagship
  //  and up to a total of 2 cruisers and/or destroyers from your reinforcements in the active system."
  // Checks: named in «Used» of a tactical action into a system with a planet I control, the hero puts my flagship
  // from the reinforcements into the active system.
  // Why the default count does not apply: ships otherwise enter the board only by production (67) or a move; the hero
  // places them, and what it places is counted on the board like any ship.
  test('leader:keleresherokuuasi places the flagship in the active system', () => {
    const table = keleres(using(attack(), id));
    quote(table.pack, id, 'Place your flagship and up to a total of 2 cruisers and/or destroyers from your reinforcements in the active system.');
    expect(endOf(table).systems[TARGET]?.flagship).toBe(1);
  });

  // LRR 37.1: the fleet pool limits the non-fighter ships in a system.
  // Checks: the flagship placed is a fourth ship beside three cruisers, beyond the fleet pool of 3, and is warned of.
  // Why the check is NOT redundant here: the hero places ships; it says nothing of the fleet pool, which still limits them.
  test('leader:keleresherokuuasi the ships placed count against the fleet pool', () => {
    const table = keleres(using(attack(), id));
    expectStanding(warningsOf(table, table.last), 'fleetPool');
  });

  // Checks: the same action without the hero keeps its three cruisers within the fleet pool.
  // Why the check is NOT redundant here: without the hero nothing is placed.
  test('leader:keleresherokuuasi not used: nothing is placed and three cruisers fit the fleet pool', () => {
    const table = keleres(attack());
    expect(endOf(table).systems[TARGET]?.flagship ?? 0).toBe(0);
    expectNone(warningsOf(table, table.last), 'fleetPool');
  });

  // "Then, purge this card." LRR 51.12.
  // Checks: the hero is purged by its use; named again, it is warned of as no longer held.
  // Why the check is NOT redundant here: the purge is the common rule of heroes.
  test('leader:keleresherokuuasi is purged by its use', () => {
    const table = keleres(using(attack(), id), using(tactical(NEAR), id));
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(table, table.last), 'componentNotHeld');
  });

  test.todo('leader:keleresherokuuasi the up to 2 cruisers and/or destroyers placed with the flagship: `uses` carries no choices for a component used beside the action');

  test('leader:keleresherokuuasi is a play effect', () => {
    const { pack } = keleres();
    expect(effect(pack, id).tier).toBe('play');
  });
});
