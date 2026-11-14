import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './yssarilagent';

describe('leader:yssarilagent Ssruu', () => {
  // "At any time: This card has the text ability of each other player's agent, even if that agent is exhausted."
  // Checks: the agent is a reminder with no waiver of its own.
  // Why nothing is validated here: which agent it copies is chosen at the table; the copied agent's effect, where it
  // lifts a check, is named in the entry's `uses` beside Ssruu, and Ssruu itself is exhausted there as any agent.
  test('leader:yssarilagent is a hint with no waiver', () => {
    const { pack } = bench({ faction: 'yssaril', expansions: ['pok'] });
    quote(pack, id, 'This card has the text ability of each other player\'s agent');
    expect(effect(pack, id).tier).toBe('hint');
  });
});
