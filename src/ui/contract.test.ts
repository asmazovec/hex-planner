/**
 * The application knows one game model, the kernel's: its table, its board and its saved game. No file of the screens, the
 * store or the storage reaches for what is left of the old model (`Game`, `Entry`, `GameState`), for the test support
 * that builds it (`src/testing`), or for the bridge between the two (`fromLegacy`, `legacyViews`, `compare`, and the
 * converters of `game/entry.ts`). Files of tests, benches and `src/ui/testing` (test support of the screens) are the
 * only ones that may.
 */
import { describe, expect, test } from 'vitest';

const raw = import.meta.glob<string>(
  ['./**/*.ts', './**/*.tsx', '../state/**/*.ts', '../storage/**/*.ts', '!**/*.test.*', '!**/*.bench.*', '!./testing/**'],
  { query: '?raw', import: 'default', eager: true },
);

const files = Object.entries(raw);

/** The types of the old model, which only `src/domain/types.ts` still holds. */
const OLD_TYPES = ['Game', 'Entry', 'EntryBody', 'GameState', 'Holdings', 'Opponent', 'Plan', 'Round'];
const OLD_CONVERTERS = ['factsOf', 'legacyPlayer', 'playerOfLegacy', 'nestedEntries'];

interface Import { names: string[]; path: string }

function importsOf(source: string): Import[] {
  const found: Import[] = [];
  for (const [, clause, path] of source.matchAll(/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+'([^']+)'/g)) {
    const names = clause.replace(/[{}*]/g, ' ').split(',').flatMap(part => {
      const [name] = part.replace(/\btype\s+/, '').trim().split(/\s+as\s+/);
      return name ? [name.trim()] : [];
    });
    found.push({ names, path });
  }
  for (const [, path] of source.matchAll(/import\s+'([^']+)'/g)) found.push({ names: [], path });
  return found;
}

describe('the application knows one game model', () => {
  test('the rule covers the screens, the store and the storage', () => {
    const names = files.map(([name]) => name);
    expect(names.some(name => name.startsWith('./screens/PlanScreen'))).toBe(true);
    expect(names.some(name => name.startsWith('../state/gameStore'))).toBe(true);
    expect(names.some(name => name.startsWith('../storage/db'))).toBe(true);
    expect(names.some(name => name.includes('/testing/'))).toBe(false);
  });

  test('no file imports test support, the bridge from the old model or its converters', () => {
    for (const [file, source] of files) {
      for (const { names, path } of importsOf(source)) {
        expect(path, `${file} imports test support`).not.toMatch(/(^|\/)testing(\/|$)/);
        expect(path, `${file} imports the bridge from the old model`).not.toMatch(/game\/(fromLegacy|legacyViews|compare)$/);
        if (/game\/entry$/.test(path)) {
          for (const name of names) expect(OLD_CONVERTERS, `${file} imports ${name} of game/entry`).not.toContain(name);
        }
      }
    }
  });

  test('no file imports a type of the old model', () => {
    for (const [file, source] of files) {
      for (const { names, path } of importsOf(source)) {
        if (!/domain\/types$/.test(path)) continue;
        for (const name of names) expect(OLD_TYPES, `${file} imports the old ${name}`).not.toContain(name);
      }
    }
  });

  test('the store holds the saved game and no derived view of it', () => {
    const store = raw['../state/gameStore.ts'];
    expect(store).not.toMatch(/^\s+(game|draft):/m);
    expect(store).not.toMatch(/gameOf|savedFor|originOf/);
  });
});
