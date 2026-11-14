import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './yssarilhero';

const table = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'yssaril', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries });

describe('leader:yssarilhero Kyver, Blade and Key', () => {
  // "ACTION: Each other player shows you 1 action card from their hand. For each player, you may either take that
  //  card or force that player to discard 3 random action cards from their hand."
  // Checks: the hero is a reminder with no play of its own.
  // Why nothing is validated here: each other player chooses the card shown (Yssaril notes, Kyver 1) and the
  // discards are random, so the plan cannot know them; the cards taken are entered by the player as gains.
  test('leader:yssarilhero is a hint with no waiver', () => {
    const { pack } = table([]);
    quote(pack, id, 'force that player to discard 3 random action cards from their hand');
    expect(effect(pack, id).tier).toBe('hint');
  });

  // "Then, purge this card." (LRR 51.12)
  // Checks: the component action purges the hero, so a second one is warned of.
  // Why the check is NOT redundant here: what the hero takes is not counted, but a hero is played once.
  test('leader:yssarilhero is purged by its play', () => {
    const first = componentAction(id);
    const again = componentAction(id);
    const t = table([first, again]);
    quote(t.pack, id, 'Then, purge this card.');
    expectNone(warningsOf(t, first), 'componentNotHeld');
    expectStanding(warningsOf(t, again), 'componentNotHeld');
  });
});
