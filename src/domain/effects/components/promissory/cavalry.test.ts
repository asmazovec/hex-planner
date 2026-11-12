import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './cavalry';

describe('promissory:cavalry The Cavalry', () => {
  // "During this combat, treat 1 of your non-fighter ships as if it has the SUSTAIN DAMAGE ability, combat value, and
  //  ANTI-FIGHTER BARRAGE value of the Nomad's flagship."
  // Checks: the note is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: it lends combat values for one combat, and the plan does not play out combat.
  test('promissory:cavalry is a hint at the combat step, with nothing to count', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'treat 1 of your non-fighter ships as if it has the SUSTAIN DAMAGE ability');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
