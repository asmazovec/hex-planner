/**
 * Contract of the rule registry: every warning code has its rules and step, every registered code is exercised by a
 * rules test, and only the domain creates warnings.
 */
import { describe, expect, test } from 'vitest';
import { WARNING_CODES, type WarningCode } from '../types';
import { forecast, HOME, NEAR, rulesGame, rulesPack, tactical } from './kit';
import { RULES, STEPS } from './registry';

const rulesTests = import.meta.glob<string>('./lrr/*.test.ts', { query: '?raw', import: 'default', eager: true });
const uiSources = import.meta.glob<string>(['../../ui/**/*.{ts,tsx}', '!../../ui/**/*.test.*'], { query: '?raw', import: 'default', eager: true });

describe('rule registry', () => {
  test('every warning code is in the registry, with at least one rule and a known step', () => {
    expect(Object.keys(RULES).sort()).toEqual([...WARNING_CODES].sort());
    for (const code of WARNING_CODES) {
      expect(RULES[code].rules.length, code).toBeGreaterThan(0);
      expect(STEPS, code).toContain(RULES[code].step);
    }
  });

  test('every registered code is exercised by at least one rules test', () => {
    const tests = Object.values(rulesTests);
    expect(tests.length).toBeGreaterThan(100);
    const untested = (Object.keys(RULES) as WarningCode[]).filter(code => !tests.some(text => text.includes(`'${code}'`)));
    expect(untested).toEqual([]);
  });

  test('src/ui creates no warning: no code literal of a warning outside its tests', () => {
    const codes = new Set<string>(WARNING_CODES);
    expect(Object.keys(uiSources).length).toBeGreaterThan(10);
    const offenders = Object.entries(uiSources)
      .flatMap(([path, text]) => [...text.matchAll(/\bcode:\s*['"](\w+)['"]/g)]
        .filter(match => codes.has(match[1]))
        .map(match => `${path}: ${match[1]}`));
    expect(offenders).toEqual([]);
  });

  test('a warning of the replay knows its rule, step and place, and still equals its plain code and params', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const game = rulesGame({ entries: [move] });
    const [warning] = forecast(game, rulesPack()).warnings[move.id];
    expect(warning).toEqual({ code: 'unitsMissing', params: { where: HOME, unit: 'cruiser', missing: 1 } });
    expect(warning.rule).toBe(RULES.unitsMissing.rules[0]);
    expect(warning.step).toBe('movement');
    expect(warning.place).toEqual({ entryId: move.id });
  });
});
