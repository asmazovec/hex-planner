import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './mentakagent';

describe('leader:mentakagent Suffi An', () => {
  // "you and that player each draw 1 action card"
  // Checks: the component is a hint shown in the block of the transaction step, and lifts nothing.
  // Why nothing is validated here: it follows a use of Pillage, which the plan does not count; the action card drawn is entered in «Taken and discarded».
  test('leader:mentakagent is a hint at the transaction step and waives nothing', () => {
    const { pack } = bench({ faction: 'mentak', expansions: ['pok'] });
    quote(pack, id, "you and that player each draw 1 action card");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['transaction']);
  });
});
