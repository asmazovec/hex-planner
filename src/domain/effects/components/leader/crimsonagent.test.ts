import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './crimsonagent';

const table = (entries: Parameters<typeof bench>[0]['entries']) =>
  bench({ faction: 'crimson', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:crimsonagent Ahk Ravin', () => {
  // "That player may swap the position of 2 of their ships in any systems; they may transport units when they swap."
  // Checks: the agent is a reminder of the component action.
  // Why nothing is validated: a swap is not a move (Ahk Ravin note 1), so no check of movement applies, and the new
  // positions are entered by the player.
  test('leader:crimsonagent is a reminder of the component action', () => {
    const { pack } = table([]);
    quote(pack, id, 'That player may swap the position of 2 of their ships in any systems');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "ACTION: Exhaust this card ..." LRR 51.4.
  // Checks: its component action exhausts the agent, so a second one in the round is warned of.
  // Why the check is NOT redundant here: an exhausted agent is readied only in the status phase (34.2).
  test('leader:crimsonagent is exhausted by its action: a second one in the round is warned of', () => {
    const again = componentAction(id);
    const crimson = table([componentAction(id), again]);
    expect(endOf(crimson).holdings.leaders[id]).toBe('exhausted');
    expectStanding(warningsOf(crimson, again), 'componentExhausted');
  });

  test.todo('leader:crimsonagent the two ships swapped (with their cargo) change places on the board: a component action has no fields for a swap');
});
