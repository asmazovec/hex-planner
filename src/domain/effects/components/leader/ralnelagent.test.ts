import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './ralnelagent';

const table = (entries: Parameters<typeof bench>[0]['entries']) =>
  bench({ faction: 'ralnel', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:ralnelagent Kan Kip Rel', () => {
  // "ACTION: Exhaust this card and draw 2 action cards; give 1 of those cards to another player."
  // Checks: the agent is a reminder of the component action.
  // Why nothing is validated: the cards drawn are unknown until drawn and are entered by the player in «Taken and
  // discarded»; which of them is given away is not counted.
  test('leader:ralnelagent is a reminder of the component action', () => {
    const { pack } = table([]);
    quote(pack, id, 'draw 2 action cards; give 1 of those cards to another player');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "ACTION: Exhaust this card ..." LRR 51.4: an agent is exhausted by its ability.
  // Checks: its component action exhausts the agent, so a second one in the round is warned of.
  // Why the check is NOT redundant here: an exhausted agent is readied only in the status phase (34.2).
  test('leader:ralnelagent is exhausted by its action: a second one in the round is warned of', () => {
    const again = componentAction(id);
    const ralnel = table([componentAction(id), again]);
    expect(endOf(ralnel).holdings.leaders[id]).toBe('exhausted');
    expectStanding(warningsOf(ralnel, again), 'componentExhausted');
  });
});
