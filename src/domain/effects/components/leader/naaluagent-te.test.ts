import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './naaluagent-te';

describe('leader:naaluagent-te Z\'eu', () => {
  // "After any player's command token is placed in a system: You may exhaust this card to return that token to that
  //  player's reinforcements."
  // Checks: the agent is a reminder of the activation step.
  // Why nothing is validated: it answers an activation, mostly another player's; no check of mine is broken or lifted
  // by a token going back to reinforcements.
  test('leader:naaluagent-te is a hint of the activation', () => {
    const { pack } = bench({ faction: 'naalu', expansions: ['pok', 'te'] });
    quote(pack, id, "After any player's command token is placed in a system");
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.todo('leader:naaluagent-te used on my own activation returns my token: the plan has no choice of which token goes back');
});
