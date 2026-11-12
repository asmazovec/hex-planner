import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './spy';

describe('actionCard:spy Spy', () => {
  // "ACTION: Choose 1 player. That player gives you 1 random action card from their hand."
  // Checks: the card is a reminder of the component action, its own step.
  // Why nothing is validated: the card taken is random and the plan does not know another player's hand; the player
  // enters the card received as a gain of the entry («Taken and discarded»).
  test('actionCard:spy is a hint of the component action', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, 'That player gives you 1 random action card from their hand.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // LRR 2.7: an action card is discarded once resolved.
  // Checks: the component action that plays Spy discards it from my hand; the card received comes in by `gains`.
  test('actionCard:spy played leaves my hand, and the card received is entered as a gain', () => {
    const play = componentAction(id, { gains: ['actionCard:sabo1'] });
    expect(endOf(bench({ faction: 'sol', start: { hand: [id] }, entries: [play] })).holdings.hand).toEqual(['actionCard:sabo1']);
  });

  // Checks: Spy played without being held is warned of, as any component not held.
  // Why the check is NOT redundant here: the card must be in my hand to be played.
  test('actionCard:spy played without being held is warned of', () => {
    const play = componentAction(id);
    expectStanding(warningsOf(bench({ faction: 'sol', entries: [play] }), play), 'componentNotHeld');
  });
});
