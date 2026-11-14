import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { standing } from '../../../rules/registry';
import type { Entry } from '../../../types';
import { before, bench, effect, endOf, quote, statusTokens, warningsOf } from '../kit';
import { id } from './become_legend';

/** The status entry of round 1 that scores the objective. */
const scoring = (): Entry => ({ ...statusTokens(0, 0, 0), scored: [id] } as Entry);
const table = (score: Entry) => bench({ faction: 'sol', expansions: ['pok'], entries: [score] });

describe('publicObjective:become_legend Become a Legend', () => {
  // "Have units in 4 systems that contain legendary planets, Mecatol Rex, or anomalies."
  // Checks: the effect is a reminder at the status step and nothing else: no waiver, no change of a number, no play.
  // Why nothing is validated here: it counts systems where the player has units at the Score Objectives step; it does not let a ship enter an anomaly or ignore any rule of movement, so the movement checks stay as they are.
  test('publicObjective:become_legend is a reminder of the status step that lifts nothing and changes no number', () => {
    const { pack } = table(scoring());
    quote(pack, id, 'Have units in 4 systems that contain legendary planets');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['status']);
    expect(found.modify).toBeUndefined();
    expect(found.nativePlay).toBeUndefined();
  });

  // LRR 61.5: "If a player fulfills the requirement described on an objective card, they can score that objective
  //  following the timing indicated on the card, either during the action phase or the status phase."
  // Checks: the objective is scored by the status entry while the player has no units in any system; it joins the scored ones, and the plan
  //  warns of nothing, since it forbids nothing and checks no scoring condition.
  // Why nothing is validated here: the condition is a picture of the board at the moment of scoring, not a rule the
  //  plan's steps break; the planner keeps the record and leaves the judgement to the player.
  test('publicObjective:become_legend scored with its condition unmet is recorded and warns of nothing', () => {
    const score = scoring();
    const plan = table(score);
    expect(endOf(plan).holdings.scored).toContain(id);
    expect(standing(warningsOf(plan, score))).toEqual([]);
  });

  // LRR 61.5 with the card's timing (status phase).
  // Checks: the reminder stands in the block of the status step while the public objective is revealed.
  // Why nothing is validated here: a reminder only shows the text; the hints of a step are asked today of the cards a
  //  player holds ready (technologies, relics, notes, hand, leaders), and a revealed public objective is not among them yet.
  test('publicObjective:become_legend its reminder stands in the status block while the public objective is revealed', () => {
    const score = scoring();
    const plan = table(score);
    const board = { ...before(plan.game, plan.pack, score), revealed: [id] };
    expect(hintsAt(plan.pack, board, 'status', ['me']).map(component => component.id)).toContain(id);
  });
});
