/**
 * Ratchet for the deletion of the old per-player model: the identifiers below name it. Non-test source may mention
 * them only in the files listed in oldModel.allow.txt (today the definitions of `Game` and `Entry` in
 * src/domain/types.ts, which the counting layer still takes as the map and the entry); the list may shrink, never grow.
 */
import { describe, expect, test } from 'vitest';
import allowText from './oldModel.allow.txt?raw';

const BANNED = ['GameState', 'Holdings', 'Opponent', 'EntryBody', 'enemyUnits', 'planetControl', 'fromCard', 'gameAs', 'legacy'];

const files = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!../**/*.bench.ts', '!../testing/**', '!../ui/testing/**', '!../**/kit.ts', '!../**/*.kit.ts', '!../**/kit-*.ts', '!../**/__oracle__/**'],
  { query: '?raw', import: 'default', eager: true },
);

describe('the old model stays out of new files', () => {
  test('banned identifiers appear in no new non-test source file', () => {
    const allowed = new Set(allowText.split(/\r?\n/).filter(Boolean));
    const fresh = Object.entries(files)
      .filter(([, text]) => BANNED.some(word => new RegExp(`\\b${word}\\b`).test(text)))
      .map(([path]) => path.startsWith('./') ? path.replace('./', 'src/game/') : path.replace('../', 'src/'))
      .filter(path => !allowed.has(path));
    expect(fresh, 'new file with an old-model identifier').toEqual([]);
  });

  test('no application file imports src/testing: the old model there is the input language of tests only', () => {
    const users = Object.entries(files).filter(([, text]) => text.includes('/testing/')).map(([path]) => path);
    expect(users).toEqual([]);
  });
});
