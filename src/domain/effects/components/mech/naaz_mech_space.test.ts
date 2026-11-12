import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, HOME, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './naaz_mech_space';

describe('mech:naaz_mech_space Z-Grav Eidolon', () => {
  // "If this unit is in the space area of the active system, it is also a ship."
  // Checks: the card is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: the plan does not play out the space combat, the only time the mech is a ship.
  test('mech:naaz_mech_space is a hint at the combat step', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'If this unit is in the space area of the active system, it is also a ship.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // Ruling (Naaz-Rokha, Eidolon / Z-Grav Eidolon 1): "The Naaz-Rokha mechs are only Z-Grav Eidolon during the Space
  //  Combat step, only in the active system, and only in the space area."
  // Checks: a Naaz-Rokha mech flown alone into the active system is a ground force with no ship to carry it: the
  // capacity warning stands.
  // Why the check is NOT redundant here: outside the space combat the mech is no ship and must be transported (16.1).
  test('mech:naaz_mech_space outside combat a mech in space still needs capacity', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { mech: 1 } }] });
    const table = bench({ faction: 'naaz', expansions: ['pok'], units: { [HOME]: { mech: 1 } }, entries: [move] });
    expectStanding(warningsOf(table, move), 'capacityGroup');
  });
});
