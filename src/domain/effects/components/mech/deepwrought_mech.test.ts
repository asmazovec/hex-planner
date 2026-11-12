import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './deepwrought_mech';

describe('mech:deepwrought_mech Eanautic', () => {
  // "When another player activates this system, if this unit is coexisting, you may move it and any of your infantry
  //  on its planet to a planet you control in your home system."
  // Checks: the mech is a reminder of the activation's block.
  // Why the check is NOT redundant here: nothing is validated, because the mech moves only while coexisting, which
  // the plan does not model, in another player's activation, and only if the Deepwrought player chooses to. The plan
  // replays no move of mine inside a rival's entry.
  test('mech:deepwrought_mech is a hint at the activation: it moves in another player\'s action', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'] });
    quote(pack, id, 'When another player activates this system, if this unit is coexisting');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });
});
