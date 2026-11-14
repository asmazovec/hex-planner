import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nomad_mech';

describe('mech:nomad_mech Quantum Manipulator', () => {
  // "While this unit is in a space area during combat, you may use its SUSTAIN DAMAGE ability to cancel a hit that is
  //  produced against your ships in this system."
  // Checks: the mech is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: it cancels hits in a combat, and the plan does not play out combat. The adjacency of
  // the Memoria to its system is printed on the flagship and on Memoria II, not on this card.
  test('mech:nomad_mech is a hint at the combat step, with nothing to count', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'cancel a hit that is produced against your ships in this system');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
  });
});
