import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './codex';

const CARDS = ['actionCard:bribery', 'actionCard:bunker', 'actionCard:dh1'];
const table = (entries: ReturnType<typeof componentAction>[], relics = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { relics }, entries });

describe('relic:codex The Codex', () => {
  // "ACTION: Purge this card to take up to 3 action cards of your choice from the action card discard pile."
  // Checks: the component action of the relic, with the three cards entered as its gains, purges the relic and puts the
  // cards in hand.
  // Why the check is redundant here: nothing needs lifting: taking cards is entered as gains, which no rule checks, and
  // the replay purges a relic whose text says "purge this card"; the effect stays a hint.
  test('relic:codex is purged by its action and the cards taken join the hand', () => {
    const play = componentAction(id, { gains: CARDS });
    const codex = table([play]);
    quote(codex.pack, id, 'Purge this card to take up to 3 action cards of your choice');
    const end = endOf(codex);
    expect(end.holdings.relics).not.toContain(id);
    expect(end.holdings.hand).toEqual(expect.arrayContaining(CARDS));
    expect(effect(codex.pack, id).tier).toBe('hint');
  });

  // LRR 22.1 / 70: a component action names a component its player holds.
  // Checks: playing the Codex twice warns of the second play, as the relic was purged by the first.
  // Why the check is NOT redundant here: the card is gone once purged; nothing lets it be played again.
  test('relic:codex played a second time is no longer held', () => {
    const again = componentAction(id);
    expectStanding(warningsOf(table([componentAction(id), again]), again), 'componentNotHeld');
  });

  test.todo('relic:codex "up to 3" cards "from the action card discard pile": the plan keeps no discard pile, so neither is checked');
});
