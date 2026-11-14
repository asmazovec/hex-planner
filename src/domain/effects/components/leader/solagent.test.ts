import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './solagent';

describe('leader:solagent Evelyn DeLouis', () => {
  // "At the start of a ground combat round: You may exhaust this card to choose 1 ground force in the active system:
  //  that ground force rolls 1 additional die during this combat round."
  // Checks: the agent is a reminder in the block of the invasion, where ground combat is fought.
  // Why nothing is validated: the card adds a die to a combat roll (Sol notes, Evelyn DeLouis 1: combat rolls only);
  // the plan rolls no dice and enters the losses of a battle by hand.
  test('leader:solagent is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'that ground force rolls 1 additional die during this combat round');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });
});
