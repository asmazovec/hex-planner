/**
 * Contract of the effects registry: every component of the catalog has an effect with a tier and a rule; every effect
 * written in a file of its own lies where `fileOf` says, names a component of the catalogue and has its tests beside
 * it; every waiver names a known code and what lifts it.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { componentsOf } from '../components';
import { EXTENSION_CODES } from '../rules/codes';
import { STEPS } from '../rules/registry';
import { WARNING_CODES } from '../types';
import { COMPONENT_FILES, effectOf, effectsOf, fileOf } from './registry';

const full = loadPack(['pok', 'te']);
/** Every set of expansions: a component one expansion replaces is in the catalogue only without it. */
const packs = [full, loadPack([]), loadPack(['pok']), loadPack(['te'])];
const everyId = new Set(packs.flatMap(pack => componentsOf(pack).map(component => component.id)));

const tests = import.meta.glob<string>(['./*.test.ts', './components/*/*.test.ts', '../rules/**/*.test.ts'], { query: '?raw', import: 'default', eager: true });
const uiTests = import.meta.glob<string>('./components/*/*.ui.test.tsx', { query: '?raw', import: 'default', eager: true });
/** The titles of the tests under src/domain/effects and src/domain/rules, as written in their files. */
const titlesIn = (text: string): string[] => [...text.matchAll(/\btest(?:\.todo|\.fails)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(match => match[2]);
const titles = Object.values(tests).flatMap(titlesIn);
const named = (id: string, title: string): boolean => new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(title);

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
    expect(applied.filter(id => !titles.some(title => named(id, title)))).toEqual([]);
  });

  test('a passive effect changes the count and a hint does not: only a passive effect has `modify`, only a passive or play effect has `play` or `choose`, only a hint has steps', () => {
    for (const pack of packs) {
      for (const [id, effect] of effectsOf(pack)) {
        if (effect.tier !== 'passive') expect(effect.modify, id).toBeUndefined();
        if (effect.tier === 'hint') {
          expect(effect.play, id).toBeUndefined();
          expect(effect.choose, id).toBeUndefined();
        }
        if (effect.tier !== 'hint') expect(effect.hintAt, id).toBeUndefined();
      }
    }
  });

  test('every waiver names a known warning code and what lifts it; only a played component waives for a round', () => {
    const codes = new Set<string>([...WARNING_CODES, ...EXTENSION_CODES.keys()]);
    for (const pack of packs) {
      for (const [id, effect] of effectsOf(pack)) {
        for (const waiver of effect.waive ?? []) {
          expect(codes, id).toContain(waiver.code);
          expect(waiver.rule.trim().length, id).toBeGreaterThan(0);
          if (waiver.lasts !== undefined) expect(effect.tier, id).not.toBe('passive');
        }
      }
    }
  });
});

describe('effect files', () => {
  const files = Object.entries(COMPONENT_FILES);

  test('the file of an id is its kind and its source id, and no two components share one', () => {
    expect(fileOf('ability:armada')).toBe('ability/armada');
    expect(fileOf('mech:argent_mech')).toBe('mech/argent_mech');
    expect(fileOf('leader:naaluagent-te')).toBe('leader/naaluagent-te');
    expect(fileOf('promissory:<color>_ta')).toBe('promissory/color_ta');
    expect(fileOf('promissory:<color>_ta@me')).not.toBe(fileOf('promissory:<color>_ta'));
    const paths = [...everyId].map(fileOf);
    expect(new Set(paths.map(path => path.toLowerCase())).size).toBe(everyId.size);
    for (const path of paths) expect(path).toMatch(/^[A-Za-z]+\/[A-Za-z0-9_-]+$/);
  });

  test('every effect file lies where its id says and names a component of the catalogue', () => {
    expect(files.length).toBeGreaterThan(3);
    for (const [path, file] of files) {
      expect(typeof file.id, path).toBe('string');
      expect(everyId, `${path} names ${file.id}`).toContain(file.id);
      expect(path).toBe(`./components/${fileOf(file.id)}.ts`);
      expect(file.effect, path).toBeDefined();
      // The registry holds what the file wrote; a hint keeps the steps of the data unless the file gives its own.
      const pack = packs.find(candidate => effectOf(candidate, file.id) !== undefined)!;
      expect(effectOf(pack, file.id)?.tier, path).toBe(file.effect.tier);
      expect(effectOf(pack, file.id)?.waive, path).toBe(file.effect.waive);
    }
  });

  test('every effect file has its own test beside it: a describe that begins with the id, every title naming the id, a quote checked against the pack', () => {
    for (const [path, file] of files) {
      const text = tests[path.replace(/\.ts$/, '.test.ts')];
      expect(text, `${path} has a test file`).toBeDefined();
      expect(text.includes(`describe('${file.id} `) || text.includes(`describe(\`${file.id} `) || text.includes(`describe("${file.id} `), `${path}: describe('${file.id} <name>')`).toBe(true);
      const own = titlesIn(text);
      expect(own.length, path).toBeGreaterThan(0);
      expect(own.filter(title => !named(file.id, title)), `${path}: every test title names ${file.id}`).toEqual([]);
      expect(text, `${path}: quote(pack, id, 'fragment') ties the quoted text to the pack`).toMatch(/\bquote\(/);
    }
  });

  test('every component that waives, changes a number or is played has a test of the interface beside it', () => {
    const missing = files
      .filter(([, file]) => file.effect.waive || file.effect.modify || file.effect.play)
      .map(([path]) => path.replace(/\.ts$/, '.ui.test.tsx'))
      .filter(path => uiTests[path] === undefined);
    expect(missing).toEqual([]);
  });

  test('a test of the interface belongs to an effect file and names its component in every title', () => {
    for (const [path, text] of Object.entries(uiTests)) {
      const file = COMPONENT_FILES[path.replace(/\.ui\.test\.tsx$/, '.ts')];
      expect(file, `${path} stands beside an effect file`).toBeDefined();
      expect(titlesIn(text).filter(title => !named(file.id, title)), path).toEqual([]);
    }
  });
});
