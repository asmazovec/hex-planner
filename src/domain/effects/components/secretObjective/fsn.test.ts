import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './fsn';

/** The warning pass 2 adds: an objective scored while the plan shows its requirement unmet (61.5, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;
const HAND = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing'];

/** The status entry of round 1 that scores the objective and discards `cards`. */
const scoring = (cards: string[]): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spends: cards } as Entry);
const table = (entries: Entry[]) => bench({ faction: 'sol', start: { secrets: [id], hand: HAND }, entries });

describe('secretObjective:fsn Form a Spy Network', () => {
  // "Discard 5 action cards."
  // Checks: the status entry scores it and discards the five cards of the hand: they leave the hand, nothing is warned.
  // Why the check is redundant here: the requirement is met by the same entry, so the warning pass 2 adds is not made.
  test('secretObjective:fsn scored with 5 action cards discarded by the same entry empties the hand and warns of nothing', () => {
    const score = scoring(HAND);
    const plan = table([score]);
    quote(plan.pack, id, 'Discard 5 action cards');
    expect(endOf(plan).holdings.hand).toEqual([]);
    expect(endOf(plan).holdings.scored).toContain(id);
    expectNone(warningsOf(plan, score), UNMET);
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective".
  // Checks: scored while the entry discards only 2 action cards: the scoring is warned of, and recorded all the same.
  // Why the check is NOT redundant here: the card lifts no rule; its own requirement is 5 discarded cards and the
  //  plan counts the hand.
  test('secretObjective:fsn scored with only 2 action cards discarded is warned of', () => {
    const score = scoring(HAND.slice(0, 2));
    const plan = table([score]);
    expectStanding(warningsOf(plan, score), UNMET);
    expect(endOf(plan).holdings.scored).toContain(id);
  });

  // Ruling: "The action cards must be discarded during the status phase. Any action cards that were discarded during
  //  the action phase will have no effect."
  // Checks: five cards discarded by an action of the action phase do not count for a scoring that discards none.
  // Why the check is NOT redundant here: the discards fall outside the card's timing, the Score Objectives step.
  test('secretObjective:fsn the cards discarded in the action phase do not count', () => {
    const score = scoring([]);
    const plan = table([componentAction('', { spends: HAND }), score]);
    expectStanding(warningsOf(plan, score), UNMET);
  });

  // Checks: the effect is played by the scoring, not a reminder.
  test('secretObjective:fsn is a play effect of its scoring', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
