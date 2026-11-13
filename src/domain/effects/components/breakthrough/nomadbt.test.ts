import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, expectStanding, expectWaived, quote, using, warningsOf } from '../kit';
import { id } from './nomadbt';

const MERCER = 'leader:nomadagentmercer';
const THUNDARIAN = 'leader:nomadagentthundarian';
const ARTUNO = 'leader:nomadagentartuno';
const AGENTS = { [MERCER]: 'unlocked', [THUNDARIAN]: 'unlocked', [ARTUNO]: 'unlocked' } as const;

const nomad = (entries: Entry[], breakthrough: 'held' | undefined = 'held') =>
  bench({ faction: 'nomad', expansions: ['pok', 'te'], start: { leaders: { ...AGENTS }, ...(breakthrough ? { breakthrough } : {}) }, entries });

describe('breakthrough:nomadbt Thunder\'s Paradox', () => {
  // "At the start of any player's turn, you may exhaust 1 of your agents to ready any other agent."
  // Checks: Mercer is exhausted by its first use; a later turn names Thunder's Paradox and exhausts The Thundarian, so
  // Mercer is used again: its warning that it is exhausted is listed and lifted by the breakthrough.
  // Why the check is redundant here: an exhausted agent cannot be used (51.4, 71.4) until it is readied, and the
  // breakthrough readies it at the start of the turn, paid with another agent.
  test('breakthrough:nomadbt an exhausted agent is used again, paid with another agent: the warning is waived', () => {
    const again = using(componentAction(MERCER), id, THUNDARIAN);
    const table = nomad([componentAction(MERCER), again]);
    quote(table.pack, id, 'exhaust 1 of your agents to ready any other agent');
    expectWaived(warningsOf(table, again), 'componentExhausted', id);
  });

  // LRR 51.4 and 71.4: an exhausted agent is readied in the status phase only.
  // Checks: the same second use of Mercer without the breakthrough named stands warned of.
  // Why the check is NOT redundant here: nothing readied Mercer.
  test('breakthrough:nomadbt not named, the second use of an agent is warned of', () => {
    const again = componentAction(MERCER);
    expectStanding(warningsOf(nomad([componentAction(MERCER), again]), again), 'componentExhausted');
  });

  // "... exhaust 1 of your agents to ready any other agent."
  // Checks: named with no other agent to exhaust as its cost, the breakthrough lifts nothing.
  // Why the check is NOT redundant here: the readying is paid by exhausting another of my agents, and none is used.
  test('breakthrough:nomadbt with no other agent exhausted for it, the agent stays exhausted', () => {
    const again = using(componentAction(MERCER), id);
    expectStanding(warningsOf(nomad([componentAction(MERCER), again]), again), 'componentExhausted');
  });

  // Checks: the agent given as the cost is exhausted already, so it pays nothing: Mercer stays exhausted.
  // Why the check is NOT redundant here: an exhausted agent cannot be exhausted again to pay a cost.
  test('breakthrough:nomadbt an agent exhausted already does not pay for it', () => {
    const again = using(componentAction(MERCER), id, THUNDARIAN);
    const table = nomad([componentAction(THUNDARIAN), componentAction(MERCER), again]);
    expect(warningsOf(table, again).filter(w => w.code === 'componentExhausted' && w.params.id === MERCER).flatMap(w => w.waivedBy ?? [])).toEqual([]);
  });

  test('breakthrough:nomadbt is named in an entry and waives an exhausted agent', () => {
    const { pack } = nomad([]);
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['componentExhausted']);
  });
});
