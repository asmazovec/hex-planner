import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { standing } from '../../../rules/registry';
import type { Entry } from '../../../types';
import { before, bench, effect, endOf, quote, statusTokens, warningsOf } from '../kit';
import { id } from './dtgs';

/** The status entry of round 1 that scores the objective. */
const scoring = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (score: Entry) => bench({ faction: 'sol', expansions: [], start: { secrets: [id] }, entries: [score] });

describe('secretObjective:dtgs Destroy Their Greatest Ship', () => {
  // "Destroy another player's war sun or flagship."
  // Checks: the effect is a reminder at the combat step and nothing else: no waiver, no change of a number, no play.
  // Why nothing is validated here: it is scored in the action phase when a war sun or flagship of another player is destroyed; the plan simulates no combat and counts no rolls, so nothing of the count can tell whether it was earned.
  test('secretObjective:dtgs is a reminder of the combat step that lifts nothing and changes no number', () => {
    const { pack } = table(scoring());
    quote(pack, id, 'Destroy another player\'s war sun or flagship');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['combat']);
    expect(found.waive ?? []).toEqual([]);
    expect(found.modify).toBeUndefined();
    expect(found.play).toBeUndefined();
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective
  //  following the timing indicated on the card, either during the action phase or the status phase."
  // Checks: the objective is scored by the status entry while no combat is fought at all; it joins the scored ones and leaves the hand, and the plan
  //  warns of nothing, since it forbids nothing and checks no scoring condition.
  // Why nothing is validated here: the condition is a picture of the board at the moment of scoring, not a rule the
  //  plan's steps break; the planner keeps the record and leaves the judgement to the player.
  test('secretObjective:dtgs scored with its condition unmet is recorded and warns of nothing', () => {
    const score = scoring();
    const plan = table(score);
    expect(endOf(plan).holdings.scored).toContain(id);
    expect(endOf(plan).holdings.secrets).not.toContain(id);
    expect(standing(warningsOf(plan, score))).toEqual([]);
  });

  // LRR 61.5 with the card's timing (action phase).
  // Checks: the reminder stands in the block of the combat step while the player holds the secret objective in hand.
  // Why nothing is validated here: a reminder only shows the text; the hints of a step are asked today of the cards a
  //  player holds ready (technologies, relics, notes, hand, leaders), and a secret objective in hand is not among them yet.
  test('secretObjective:dtgs its reminder stands in the combat block while the player holds the secret objective in hand', () => {
    const score = scoring();
    const plan = table(score);
    const board = before(plan.game, plan.pack, score);
    expect(hintsAt(plan.pack, board, 'combat', ['me']).map(component => component.id)).toContain(id);
  });
});
