import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './naazagent';

describe('leader:naazagent Garv and Gunn', () => {
  // "At the end of a player's turn: You may exhaust this card to allow that player to explore 1 of their planets."
  // Checks: the agent is a reminder with no step and lifts nothing.
  // Why nothing is validated here: exploration is not planned, so what the agent allows has nothing to be counted at.
  test('leader:naazagent is a hint with no step: exploration is not planned', () => {
    const { pack } = bench({ faction: 'naaz', expansions: ['pok'] });
    quote(pack, id, 'allow that player to explore 1 of their planets');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // "You may exhaust this card ..." with LRR 51.4: an agent is readied in the status phase.
  // Checks: used twice in a round, the second use is warned of: the replay exhausts any agent it plays.
  // Why the check is NOT redundant here: the agent is exhausted by its own use, and nothing of the Naaz-Rokha readies it.
  test('leader:naazagent used twice in a round: the second use finds it exhausted', () => {
    const again = componentAction(id);
    const table = bench({ faction: 'naaz', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [componentAction(id), again] });
    expectStanding(warningsOf(table, again), 'componentExhausted');
  });
});
