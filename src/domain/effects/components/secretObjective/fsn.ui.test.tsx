import { describe, test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, quote, statusTokens } from '../kit';
import { id } from './fsn';

uiBench();

/** The warning pass 2 adds: an objective scored while the plan shows its requirement unmet (61.5, step status). */
const UNMET = 'objectiveUnmet' as AnyWarningCode;
const HAND = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing'];

const scoring = (cards: string[]): Entry => ({ ...statusTokens(0, 0, 0), scored: [id], spends: cards } as Entry);
const table = (score: Entry) => bench({ faction: 'sol', start: { secrets: [id], hand: HAND }, entries: [score] });

describe('secretObjective:fsn Form a Spy Network', () => {
  // "Discard 5 action cards."
  // Checks: the status entry that scores it while discarding 2 action cards shows the unmet requirement in its list.
  // Why the check is NOT redundant here: the card's own requirement is 5 discarded cards; the plan counts the hand.
  test('secretObjective:fsn scored with 2 action cards discarded shows the unmet requirement', () => {
    const score = scoring(HAND.slice(0, 2));
    const plan = table(score);
    quote(plan.pack, id, 'Discard 5 action cards');
    showWarnings(plan, score);
    expectShownStanding(UNMET);
  });

  // Checks: discarding all five shows nothing.
  // Why the check is redundant here: the requirement is met by the same entry.
  test('secretObjective:fsn scored with 5 action cards discarded shows nothing', () => {
    const score = scoring(HAND);
    showWarnings(table(score), score);
    expectNotShown(UNMET);
  });
});
