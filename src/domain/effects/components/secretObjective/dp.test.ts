import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { STEPS } from '../../../rules/registry';
import type { StartHoldings } from '../../../types';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './dp';

const table = (start: StartHoldings) => bench({ faction: 'sol', expansions: ['pok'], start });

describe('secretObjective:dp Dictate Policy', () => {
  // "There are 3 or more laws in play."
  // Checks: the objective is a reminder with no step, and nothing else: no waiver, no change of a number, nothing played.
  // Why no check is redundant here: the card lifts no rule of the Rules Reference; it is the condition of a victory
  //  point (LRR 61.4), and it is scored in the agenda phase, which the plan does not play step by step, so it has no
  //  block to stand in.
  test('secretObjective:dp is a hint with no step, with no waiver and no change of the count', () => {
    const { pack } = table({});
    quote(pack, id, 'There are 3 or more laws in play');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(undefined);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
    expect(found.play).toBeUndefined();
  });

  // "There are 3 or more laws in play."
  // Checks: with no step of its own the card stands among the reminders of none of the steps, in hand or not.
  // Why no check is redundant here: none is made; it is scored in the agenda phase, which the plan does not play
  //  step by step, so it has no block to stand in.
  test('secretObjective:dp reminds of itself at no step of the plan', () => {
    const board = endOf(table({ secrets: [id] }));
    for (const step of STEPS) expect(hintsAt(table({}).pack, board, step, ['me']).map(c => c.id), step).not.toContain(id);
  });
});
