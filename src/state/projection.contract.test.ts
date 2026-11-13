/**
 * The only computing entry of the app is `src/state/projection.ts`, and it computes with the game kernel: nothing in
 * `src/ui`, `src/state` or `src/game` (the test files and the differential test apart) reaches the old replay, which
 * stays only as the oracle of the differential test.
 */
import { describe, expect, test } from 'vitest';

const sources: Record<string, string> = import.meta.glob(['/src/ui/**/*.{ts,tsx}', '/src/state/**/*.ts', '/src/game/**/*.ts', '!**/*.test.*', '!**/*.bench.*', '!**/differential.ts'], { query: '?raw', import: 'default', eager: true });
const [oracle] = Object.values(import.meta.glob('/src/domain/replay/timeline.ts', { query: '?raw', import: 'default', eager: true }));
const app = Object.keys(sources);
/** What computes the state of a plan in the old replay. */
const REPLAYS = ['timeline', 'project', 'projectionAtRound', 'projectionOf', 'boardBefore', 'boardAfter', 'seenBefore', 'seenAfter', 'blockersIn', 'blockersBefore', 'stateBeforeEntry', 'stateAfterEntry', 'boardBeforeEntry', 'routeReach', 'tacticalNumbers', 'tacticalsOf'];

const importsOf = (source: string): { names: string[]; from: string }[] =>
  [...source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)].map(m => ({
    names: m[1].split(',').map(n => n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean), from: m[2],
  }));

describe('the app computes with the kernel through one module', () => {
  test('no file of the app imports the old replay timeline', () => {
    const bad = app.filter(f => importsOf(sources[f]).some(i => /domain\/replay\/timeline$/.test(i.from)));
    expect(bad).toEqual([]);
  });

  test('no screen or store asks the old replay for a state: they ask src/state/projection', () => {
    const bad = app.filter(f => !f.startsWith('/src/game/')).flatMap(f =>
      importsOf(sources[f]).filter(i => /domain\/(project|replay(\/index)?|route)$/.test(i.from) && i.names.some(n => REPLAYS.includes(n))).map(i => `${f}: ${i.names.filter(n => REPLAYS.includes(n)).join(', ')}`));
    expect(bad).toEqual([]);
  });

  test('the projection module imports the kernel timeline', () => {
    const imports = importsOf(sources['/src/state/projection.ts']);
    expect(imports.some(i => /game\/timeline$/.test(i.from))).toBe(true);
  });

  test('the old replay timeline says that it is the oracle only', () => {
    expect(oracle.slice(0, 600)).toMatch(/oracle/i);
  });
});
