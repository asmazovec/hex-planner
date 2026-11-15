/**
 * The old per-player model (`Game`, `Entry`, `GameState`, `Holdings`, ...) lives only in src/testing/old, where the
 * tests of the rules and the components speak it as their input language. The application names none of it and imports
 * nothing from src/testing. Nor does it keep the old model's shape under other names: a player is always a `PlayerId`
 * of the table, never `me` against "the opponents", and nothing translates to or from the old ids of players.
 */
import { describe, expect, test } from 'vitest';

const BANNED = ['GameState', 'Holdings', 'Opponent', 'EntryBody', 'enemyUnits', 'planetControl', 'fromCard', 'gameAs', 'TableFacts'];
/** The old ids of players and what translated them: `legacyId`, `legacyKey`, `legacyNote` and the like, the key functions, the viewer's own field of points. */
const OLD_KEYS = /\b(?:legacy[A-Z]\w*|playerOfLegacy|playerOfKey|ownerKey|opponentVp)\b/;
/** The viewer named in the logic. The one place it stays is the query parameter `me` of a share link, an external format. */
const ME = /['"`]me['"`]/;
const SHARE_LINK = 'src/domain/shareLink.ts';
const ME_IN_LINK = /query\.(?:get|set)\('me'/g;
/** A list of "the others" beside the viewer, as a field of a type or of a value. */
const OPPONENTS = /\bopponents\??\s*:/;


const files = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!../**/*.bench.ts', '!../testing/**', '!../ui/testing/**', '!../domain/rules/kit.ts', '!../domain/rules/lrr/kit-*.ts', '!../domain/effects/components/kit.ts', '!../domain/effects/points/status.kit.ts', '!../**/__oracle__/**'],
  { query: '?raw', import: 'default', eager: true },
);
const named = (path: string): string => (path.startsWith('./') ? path.replace('./', 'src/game/') : path.replace('../', 'src/'));
const offenders = (breaks: (text: string, name: string) => boolean): string[] =>
  Object.entries(files).filter(([path, text]) => breaks(text, named(path))).map(([path]) => named(path)).sort();

describe('the application does not know the old model', () => {
  test('no non-test source file names an old-model identifier', () => {
    expect(offenders(text => BANNED.some(word => new RegExp(`\\b${word}\\b`).test(text)))).toEqual([]);
  });

  test('no non-test source file defines or imports the old `Game` or `Entry`', () => {
    const defines = /\b(?:interface|type)\s+(?:Game|Entry)\b/;
    const imports = /import[^;]*\b(?:Game|Entry)\b[^;]*from\s+'[^']*domain\/types'/;
    expect(offenders(text => defines.test(text) || imports.test(text))).toEqual([]);
  });

  test('no application file imports src/testing: the old model there is the input language of tests only', () => {
    expect(offenders(text => text.includes('/testing/'))).toEqual([]);
  });

  test('no non-test source file names a player by an old id or translates one', () => {
    expect(offenders(text => OLD_KEYS.test(text))).toEqual([]);
  });

  test('no non-test source file says `me`: a player is a `PlayerId` of the table', () => {
    expect(offenders((text, name) => ME.test(name === SHARE_LINK ? text.replace(ME_IN_LINK, '') : text))).toEqual([]);
  });

  test('no non-test source file keeps "the opponents" as a field beside the viewer', () => {
    expect(offenders(text => OPPONENTS.test(text))).toEqual([]);
  });
});
