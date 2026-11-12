import { describe, expect, test } from 'vitest';
import { bench, effect, expectNone, expectStanding, quote, statusTokens, warningsOf } from '../kit';
import { id } from './versatile';

const status = (faction: string, tokens: number) => {
  const entry = statusTokens(tokens, 0, 0);
  return { entry, ...bench({ faction, entries: [entry] }) };
};

describe('ability:versatile Versatile', () => {
  // "When you gain command tokens during the status phase: Gain 1 additional command token."
  // Checks: the Sol player gains three tokens in the status phase and no warning is made.
  // Why the default limit does not apply: 81.5 gives two tokens; the ability does not lift the check, it changes its
  // number to three (a `modify` of `tokensGained` at the step `status`), so nothing is listed as waived.
  test.fails('ability:versatile lets the Sol player gain three tokens in the status phase', () => {
    const sol = status('sol', 3);
    quote(sol.pack, id, 'When you gain command tokens during the status phase: Gain 1 additional command token.');
    expectNone(warningsOf(sol, sol.entry), 'tokensOver');
  });

  // Checks: a fourth token is beyond the changed number, and the warning names three free.
  // Why the check is NOT redundant here: Versatile adds one token, it does not remove the limit.
  test.fails('ability:versatile still warns of a fourth token, against three', () => {
    const sol = status('sol', 4);
    const warnings = warningsOf(sol, sol.entry);
    expectStanding(warnings, 'tokensOver');
    expect(warnings.find(w => w.code === 'tokensOver')?.params).toMatchObject({ given: 4, free: 3 });
  });

  // LRR 81.5: "Each player gains two command tokens."
  // Checks: another faction gaining three is warned of against two.
  // Why the check is NOT redundant here: the ability is printed on the Sol faction sheet alone.
  test('ability:versatile is the Federation of Sol\'s own: another faction gains two', () => {
    const letnev = status('letnev', 3);
    expect(warningsOf(letnev, letnev.entry).find(w => w.code === 'tokensOver')?.params).toMatchObject({ given: 3, free: 2 });
  });

  // Checks: the ability changes a number of the count: a passive effect with no waiver.
  test.fails('ability:versatile is a passive effect that modifies the tokens gained', () => {
    const { pack } = status('sol', 2);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.tokensGained).toBeDefined();
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
