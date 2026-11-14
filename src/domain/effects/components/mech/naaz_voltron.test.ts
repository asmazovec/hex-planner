import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './naaz_voltron';

/** Everything of `units` flies from the home system to the next one; Absolute Synergy is held when `flipped`. */
const flight = (units: UnitCounts, flipped = true, faction = 'naaz') => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units }] });
  return { move, ...bench({ faction, expansions: ['pok', 'te'], units: { [HOME]: units }, start: flipped ? { breakthrough: 'held' } : {}, entries: [move] }) };
};

describe('mech:naaz_voltron Eidolon Maximum', () => {
  // "This unit is both a ship and ground force."
  // Checks: with Absolute Synergy gained, a Naaz-Rokha mech flies alone into the next system; the capacity warnings of
  // the group and of the system are listed and lifted by Eidolon Maximum.
  // Why the check is redundant here: the capacity check (16.1, 16.3) counts a mech as a ground force that must be
  // transported; Eidolon Maximum is a ship and moves by itself (Move 3 on the flipped card), so it takes no place.
  test('mech:naaz_voltron flies by itself with no ship to carry it: the capacity warnings are waived', () => {
    const table = flight({ mech: 1 });
    quote(table.pack, id, 'This unit is both a ship and ground force.');
    const warnings = warningsOf(table, table.move);
    expectWaived(warnings, 'capacityGroup', id);
    expectWaived(warnings, 'capacitySystem', id);
  });

  // Checks: a carrier with four infantry and the Eidolon Maximum: the load beside the mech fits the carrier's 4, so
  // the warning is lifted.
  // Why the check is redundant here: the one mech that is a ship is not transported.
  test('mech:naaz_voltron beside a full carrier takes no place on board', () => {
    const table = flight({ carrier: 1, infantry: 4, mech: 1 });
    expectWaived(warningsOf(table, table.move), 'capacityGroup', id);
  });

  // Ruling (Naaz-Rokha, Eidolon Maximum 4): "The Naaz-Rokha player can never have two or more Eidolon Maximums on the
  //  game board."
  // Checks: two mechs flying alone stay over capacity: one of them is an ordinary Eidolon.
  // Why the check is NOT redundant here: only one mech is the ship; the other must be transported.
  test('mech:naaz_voltron only one mech is a ship: two mechs alone stand over capacity', () => {
    const table = flight({ mech: 2 });
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // "When you have 4 mechs in the same system, you may return 3 of those mechs ... to flip this card and place it on top
  //  of your mech card." (Absolute Synergy)
  // Checks: without the breakthrough the mech is an Eidolon and a lone mech in space is over capacity.
  // Why the check is NOT redundant here: Eidolon Maximum exists only once Absolute Synergy is flipped.
  test('mech:naaz_voltron without Absolute Synergy a lone mech is over capacity', () => {
    const table = flight({ mech: 1 }, false);
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  // Checks: another faction holding a breakthrough of its own gets nothing from the Naaz-Rokha card.
  test('mech:naaz_voltron is the Naaz-Rokha\'s own: another faction\'s lone mech is over capacity', () => {
    const table = flight({ mech: 1 }, true, 'nomad');
    expectStanding(warningsOf(table, table.move), 'capacityGroup');
  });

  test.todo('mech:naaz_voltron counts towards either capacity or the fleet pool, and moves 3: the plan does not tell the Eidolon Maximum from the other mechs');

  test('mech:naaz_voltron is a passive effect that waives both capacity checks', () => {
    const { pack } = flight({ mech: 1 });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code).sort()).toEqual(['capacityGroup', 'capacitySystem']);
  });
});
