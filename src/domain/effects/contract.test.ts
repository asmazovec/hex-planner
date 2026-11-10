/**
 * Contract of the effects registry: every component of the catalog has an effect with a tier and a rule, and every
 * effect the app applies by itself (`passive`, `play`) is named in the title of a test.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { componentsOf } from '../components';
import { STEPS } from '../rules/registry';
import { effectOf, effectsOf } from './registry';

const full = loadPack(['pok', 'te']);
const tests = import.meta.glob<string>(['./*.test.ts', '../rules/**/*.test.ts'], { query: '?raw', import: 'default', eager: true });
/** The titles of the tests under src/domain/effects and src/domain/rules, as written in their files. */
const titles = Object.values(tests).flatMap(text => [...text.matchAll(/\btest(?:\.todo)?\(\s*'((?:\\.|[^'\\])*)'/g)].map(match => match[1]));

describe('effects registry', () => {
  test('every component of the catalog has an effect, with a tier and a rule', () => {
    const catalog = componentsOf(full);
    expect(catalog).toHaveLength(697);
    expect(effectsOf(full).size).toBe(catalog.length);
    for (const component of catalog) {
      const effect = effectOf(full, component.id);
      expect(effect, component.id).toBeDefined();
      expect(['passive', 'play', 'hint'], component.id).toContain(effect?.tier);
      expect(effect?.rule, component.id).toBeTruthy();
      for (const step of effect?.hintAt ?? []) expect(STEPS, component.id).toContain(step);
    }
  });

  test('the same holds for every set of expansions: the base game alone, and with Prophecy of Kings', () => {
    for (const pack of [loadPack([]), loadPack(['pok']), loadPack(['te'])]) {
      expect(componentsOf(pack).filter(component => effectOf(pack, component.id) === undefined)).toEqual([]);
    }
  });

  test('a component the pack does not have has no effect', () => {
    expect(effectOf(loadPack([]), 'relic:nanoforge')).toBeUndefined();
    expect(effectOf(full, 'nonsense')).toBeUndefined();
  });

  test('every passive and play effect is named, by its component id, in the title of a test', () => {
    expect(titles.length).toBeGreaterThan(1000);
    const applied = [...effectsOf(full)].filter(([, effect]) => effect.tier !== 'hint').map(([id]) => id);
    expect(applied.length).toBeGreaterThan(20);
    const named = (id: string) => titles.some(title => new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(title));
    expect(applied.filter(id => !named(id))).toEqual([]);
  });

  test('a passive effect changes the count and a hint does not: only a passive or play effect has `modify` or `play`', () => {
    for (const [id, effect] of effectsOf(full)) {
      if (effect.tier === 'hint') expect(effect.modify ?? effect.play, id).toBeUndefined();
      else expect(effect.hintAt, id).toBeUndefined();
    }
  });
});
