import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './deepwroughtbt';

const deepwrought = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'deepwrought', expansions: ['pok', 'te'], start: { breakthrough: 'held' }, entries });

describe('breakthrough:deepwroughtbt Visionaria Select', () => {
  // "ACTION: Exhaust this card to allow each other player to spend 3 trade goods and give you 1 promissory note. Each
  //  player that does may research a non-faction, non-unit upgrade technology. You also gain each technology
  //  researched in this way."
  // Checks: the breakthrough is a reminder of the component action's block.
  // Why the check is NOT redundant here: nothing is validated, because who takes part, which note they give and what
  // they research are the other players' choices; the player enters the notes and technologies gained as gains of
  // the component action, which the plan already counts.
  test('breakthrough:deepwroughtbt is a hint at the component action: the others\' choices are entered as gains', () => {
    const { pack } = deepwrought([]);
    quote(pack, id, 'You also gain each technology researched in this way.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "ACTION: Exhaust this card" LRR 34.4.
  // Checks: the action exhausts the breakthrough; a second one in the round is warned of; what it gains is counted.
  // Why the check is NOT redundant here: an exhausted card is readied only in the status phase.
  test('breakthrough:deepwroughtbt is exhausted by its action, and the technologies entered as gains are held', () => {
    const again = componentAction(id);
    const first = componentAction(id, { gains: ['technology:gd'] });
    const table = deepwrought([first, again]);
    const end = endOf(table);
    expect(end.holdings.breakthrough).toBe('exhausted');
    expect(end.holdings.technologies).toContain('technology:gd');
    expectStanding(warningsOf(table, again), 'componentExhausted');
  });
});
