import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './hacan_mech';

describe('mech:hacan_mech Pride of Kenara', () => {
  // "This planet's card may be traded as part of a transaction; if you do, move all of your units from this planet to
  //  another planet you control."
  // Checks: the mech is a hint.
  // Why nothing is validated: a transaction of the plan hands over components of the holdings; a planet card is the
  // control of a planet, which no transaction of the plan moves, and the planet the units go to is the player's choice.
  test('mech:hacan_mech is a hint: the plan trades no planet cards', () => {
    const { pack } = bench({ faction: 'hacan', expansions: ['pok'] });
    quote(pack, id, "This planet's card may be traded as part of a transaction");
    expect(effect(pack, id).tier).toBe('hint');
  });

  test.todo('mech:hacan_mech the planet with the mech changes control in a transaction and the units move to another planet: a transaction carries no planet');
});
