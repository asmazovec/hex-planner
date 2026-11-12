import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, primary, quote, statusTokens, warningsOf } from '../kit';
import { id } from './hm';

/** The status entry of round 1 takes `tactic`, `fleet` and `strategy` tokens, the card held or not. */
const status = (tactic: number, fleet: number, strategy: number, technologies: string[] = [id]) => {
  const entry = statusTokens(tactic, fleet, strategy);
  return { entry, ...bench({ faction: 'sol', start: { technologies }, entries: [entry] }) };
};

describe('technology:hm Hyper Metabolism', () => {
  // "During the status phase, gain 3 command tokens instead of 2."
  // Checks: the status entry takes three tokens and nothing is warned of.
  // Why the check is redundant here: the check is not lifted, its number changes: 81.5 gives two tokens and the card
  // three, so this is a `modify` of the point `tokensGained` at the step `status`, and nothing is listed as waived.
  test.fails('technology:hm lets the status phase gain three command tokens with no warning', () => {
    const table = status(1, 1, 1);
    quote(table.pack, id, 'During the status phase, gain 3 command tokens instead of 2.');
    expectNone(warningsOf(table, table.entry), 'tokensOver');
  });

  // Checks: a fourth token is beyond the changed number, and the warning names the 3 the card gives.
  // Why the check is NOT redundant here: the card raises the number, it does not remove it.
  test.fails('technology:hm still warns of a fourth token, against three', () => {
    const table = status(2, 1, 1);
    const warnings = warningsOf(table, table.entry);
    expectStanding(warnings, 'tokensOver');
    expect(warnings.find(w => w.code === 'tokensOver')?.params).toMatchObject({ given: 4, free: 3 });
  });

  // LRR 81.5: "Each player gains two command tokens."
  // Checks: without the card three tokens are warned of against two.
  // Why the check is NOT redundant here: nothing this player holds changes the tokens of the status phase.
  test('technology:hm not held: a third token is warned of against two', () => {
    const table = status(1, 1, 1, []);
    const warnings = warningsOf(table, table.entry);
    expectStanding(warnings, 'tokensOver');
    expect(warnings.find(w => w.code === 'tokensOver')?.params).toMatchObject({ given: 3, free: 2 });
  });

  // "During the status phase ..."
  // Checks: tokens gained outside the status phase are not raised: Leadership's primary gives 3, the fourth is
  // warned of all the same.
  // Why the check is NOT redundant here: the card speaks of the status phase only.
  test('technology:hm does not raise the tokens of Leadership\'s primary', () => {
    const leadership = primary(1, { tokens: { tactic: 2, fleet: 1, strategy: 1 } });
    const table = bench({ faction: 'sol', start: { technologies: [id] }, entries: [leadership] });
    expectStanding(warningsOf(table, leadership), 'tokensOver');
  });

  test.fails('technology:hm is a passive effect that changes the tokens gained, with no waiver', () => {
    const { pack } = status(1, 1, 0);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.tokensGained?.(2, { step: 'status' })).toBe(3);
    expect(effect(pack, id).modify?.tokensGained?.(3, { step: 'card' })).toBe(3);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
