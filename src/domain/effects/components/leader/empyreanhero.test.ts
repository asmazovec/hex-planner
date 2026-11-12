import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './empyreanhero';

const table = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'empyrean', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:empyreanhero Conservator Procyon', () => {
  // "ACTION: Place 1 frontier token in each system that does not contain any planets ... Then, explore each frontier
  //  token that is in a system that contains 1 or more of your ships."
  // Checks: the hero is a reminder of the component action.
  // Why nothing is validated here: frontier tokens and exploration are not tracked by the plan; what the cards
  // explored bring is entered as gains.
  test('leader:empyreanhero is a hint of the component action', () => {
    const { pack } = table([]);
    quote(pack, id, 'Place 1 frontier token in each system that does not contain any planets');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "Then, purge this card." (LRR 51.12)
  // Checks: the hero is purged by its action, so a second one is warned of.
  test('leader:empyreanhero is purged by its play', () => {
    const again = componentAction(id);
    expectStanding(warningsOf(table([componentAction(id), again]), again), 'componentNotHeld');
  });
});
