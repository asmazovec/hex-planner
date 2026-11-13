import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { effectsOf } from './registry';

/** Every file of the interface: the screens that ask `StepHints` for a step do it by `step="…"` or by `hints('…')`. */
const screens = import.meta.glob<string>(['../../ui/**/*.tsx', '!../../ui/**/*.test.tsx', '!../../ui/testing/**'], { query: '?raw', import: 'default', eager: true });

describe('the reminders of every step have a screen', () => {
  const asked = new Set<string>();
  for (const source of Object.values(screens)) {
    for (const found of source.matchAll(/<StepHints\b[^>]*\bstep="(\w+)"/g)) asked.add(found[1]);
    for (const found of source.matchAll(/\bhints\('(\w+)'\)/g)) asked.add(found[1]);
  }

  // A component that says `hintAt` a step is reminded of there: without a block that asks for the step, its text would show nowhere.
  test('each step an effect names in `hintAt` is asked for by some screen through StepHints', () => {
    const used = new Set<string>();
    for (const [, effect] of effectsOf(loadPack(['pok', 'te']))) for (const step of effect.hintAt ?? []) used.add(step);
    expect(used.size).toBeGreaterThan(5);
    expect([...used].filter(step => !asked.has(step)).sort()).toEqual([]);
  });
});
