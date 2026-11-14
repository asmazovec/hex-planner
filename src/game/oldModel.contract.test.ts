/**
 * The old per-player model (`Game`, `Entry`, `GameState`, `Holdings`, ...) lives only in src/testing/old, where the
 * tests of the rules and the components speak it as their input language. The application names none of it and imports
 * nothing from src/testing. No allow-list: the rule holds for every non-test source file.
 */
import { describe, expect, test } from 'vitest';

const BANNED = ['GameState', 'Holdings', 'Opponent', 'EntryBody', 'enemyUnits', 'planetControl', 'fromCard', 'gameAs', 'legacy'];

const files = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!../**/*.bench.ts', '!../testing/**', '!../ui/testing/**', '!../**/kit.ts', '!../**/*.kit.ts', '!../**/kit-*.ts', '!../**/__oracle__/**'],
  { query: '?raw', import: 'default', eager: true },
);
const named = (path: string): string => path.startsWith('./') ? path.replace('./', 'src/game/') : path.replace('../', 'src/');

describe('the application does not know the old model', () => {
  test('no non-test source file names an old-model identifier', () => {
    const found = Object.entries(files)
      .filter(([, text]) => BANNED.some(word => new RegExp(`\b${word}\b`).test(text)))
      .map(([path]) => named(path));
    expect(found).toEqual([]);
  });

  test('no non-test source file defines or imports the old `Game` or `Entry`', () => {
    const defines = /\b(?:interface|type)\s+(?:Game|Entry)\b/;
    const imports = /import[^;]*\b(?:Game|Entry)\b[^;]*from\s+'[^']*domain\/types'/;
    const found = Object.entries(files).filter(([, text]) => defines.test(text) || imports.test(text)).map(([path]) => named(path));
    expect(found).toEqual([]);
  });

  test('no application file imports src/testing: the old model there is the input language of tests only', () => {
    const users = Object.entries(files).filter(([, text]) => text.includes('/testing/')).map(([path]) => named(path));
    expect(users).toEqual([]);
  });
});
