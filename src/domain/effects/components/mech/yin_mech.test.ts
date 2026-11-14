import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './yin_mech';

describe('mech:yin_mech Moyin\'s Ashes', () => {
  // "DEPLOY: When you use your Indoctrination faction ability, you may spend 1 additional influence to replace your
  //  opponent's unit with 1 mech instead of 1 infantry."
  // Checks: the deploy is a reminder of the invasion step.
  // Why nothing is validated here: it rides on Indoctrination at the start of a ground combat, which the plan does
  // not simulate; the mech placed is entered by the player with the result of the invasion. The supply of four mechs
  // is the replay's own check of reinforcements, the same with the mech or without it.
  test('mech:yin_mech is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'yin', expansions: ['pok'] });
    quote(pack, id, 'you may spend 1 additional influence to replace your opponent\'s unit with 1 mech instead of 1 infantry');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
