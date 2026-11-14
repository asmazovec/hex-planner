import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naaz_mech';

describe('mech:naaz_mech Eidolon', () => {
  // "If this unit is in the space area of the active system at the start of a space combat, flip this card."
  // Checks: the mech is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: the card turns over only for a space combat, which the plan does not play out; what
  // it is then is Z-Grav Eidolon's own file.
  test('mech:naaz_mech is a hint at the combat step, with nothing to count', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'at the start of a space combat, flip this card');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
  });
});
