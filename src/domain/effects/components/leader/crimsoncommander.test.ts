import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './crimsoncommander';

describe('leader:crimsoncommander Ahk Siever', () => {
  // "At the end of a combat between any players: Gain 1 commodity or convert 1 of your commodities to a trade good."
  // Checks: the commander is a reminder in the block of combat.
  // Why nothing is validated: combats are not simulated, the Rebellion need not take part (Ahk Siever note 3), and
  // the end of another player's combat is not an entry of the plan.
  test('leader:crimsoncommander is a reminder of combat', () => {
    const { pack } = bench({ faction: 'crimson', expansions: ['pok', 'te'] });
    quote(pack, id, 'Gain 1 commodity or convert 1 of your commodities to a trade good.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });
});
