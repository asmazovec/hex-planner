import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './sol_mech';

const ORBITAL_DROP = 'ability:orbital_drop';
/** Orbital Drop on h1, deploying the mech with it. */
const dropWithMech = () => using(componentAction(ORBITAL_DROP, { choices: { planet: 'h1' } } as Partial<Entry>), id);
const sol = (entries: Entry[], units = {}) => bench({ faction: 'sol', expansions: ['pok'], units, entries });

describe('mech:sol_mech ZS Thunderbolt M2', () => {
  // "DEPLOY: After you use your Orbital Drop faction ability, you may spend 3 resources to place 1 mech on that planet."
  // Checks: the Orbital Drop entry names the mech; one mech stands on h1 with the two infantry.
  // Why the check is redundant here: a mech comes onto the board by production (67) or by its Deploy ability (30.1);
  // the deploy places it without a unit with Production, so no production check applies.
  test('mech:sol_mech deploys one mech on the planet of the Orbital Drop', () => {
    const table = sol([dropWithMech()]);
    quote(table.pack, id, 'After you use your Orbital Drop faction ability, you may spend 3 resources to place 1 mech on that planet.');
    expect(endOf(table).ground.h1?.mech).toBe(1);
  });

  // LRR 30.2: "A player can only resolve a Deploy ability to place a unit that is in their reinforcements."
  // Checks: with all four mechs already on the board, the deploy is warned of.
  // Why the check is NOT redundant here: the deploy places a unit of the reinforcements, and there is none left.
  test('mech:sol_mech with no mech left in reinforcements is warned of', () => {
    const entry = dropWithMech();
    const table = sol([entry], { [NEAR]: { mech: 4 } });
    expectStanding(warningsOf(table, entry), 'reinforcementsOut');
  });

  // "After you use your Orbital Drop faction ability"
  // Checks: the mech named in a tactical action without Orbital Drop places nothing.
  // Why the check is NOT redundant here: the deploy follows Orbital Drop only.
  test('mech:sol_mech without Orbital Drop places no mech', () => {
    const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] }), id);
    const end = endOf(sol([move], { [HOME]: { cruiser: 1 } }));
    expect(end.ground.h1?.mech ?? 0).toBe(0);
  });

  test.todo('mech:sol_mech the deploy costs 3 resources: a component entry has no payment yet');

  // Checks: the deploy changes the board when Orbital Drop is played with it: a `play`.
  test('mech:sol_mech is a play effect', () => {
    expect(effect(sol([]).pack, id).tier).toBe('play');
  });
});
