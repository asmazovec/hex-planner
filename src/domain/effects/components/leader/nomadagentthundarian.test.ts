import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './nomadagentthundarian';

describe('leader:nomadagentthundarian The Thundarian', () => {
  // "After the "Roll Dice" step of combat: You may exhaust this card. If you do, hits are not assigned to either
  //  player's units."
  // Checks: the agent is a reminder in the combat block and lifts nothing.
  // Why nothing is validated here: it rerolls a combat round, and the plan rolls no dice.
  test('leader:nomadagentthundarian is a hint at the combat step, with nothing to count', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'hits are not assigned to either player\'s units');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
