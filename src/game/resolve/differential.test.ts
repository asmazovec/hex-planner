/**
 * The differential test of the kernel: every entry the old replay has, of every type, resolved again on the kernel, must
 * give the same board for every player and the same warnings. Two ways, on the same corpus:
 *  - entry by entry: the old frame before the entry is rebuilt as a board and the entry resolved on it;
 *  - whole plans: the kernel's timeline, the board flowing from turn to turn, agrees with the old one after every entry,
 *    in "now" and in "forecast".
 * The corpus is every game the tests build: the LRR rules tests and the component tests (through the rules kit's watcher
 * and the hook of `project`; the test files are imported here, so their tests run in this file with the watchers on), and
 * the real four-player game in plans/, all plans, mine and the rivals'.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { watchProjects } from '../../domain/replay';
import { watchGames } from '../../domain/rules/kit';
import type { DataPack, Game } from '../../domain/types';
import { compareGame, compareTimelines, whereDiffers, type Detail, type Exclusion, type Outcome } from './differential';

const onlyIn = (detail: Detail, path: RegExp): boolean => {
  const diffs = whereDiffers(detail.oldState, detail.newState, '', []);
  return diffs.length > 0 && diffs.every(d => path.test(d));
};

/** Cases where the old replay is wrong by the rules, each with its reason; the same list is in docs/superpowers/specs/2026-11-13-game-model-differences.md. */
export const EXCLUSIONS: Exclusion[] = [
  // A structure belongs to the owner of its planet (the kernel); the old state keeps the one a card built on a planet no one holds.
  { reason: 'structure on a planet no one controls', matches: (_, d) => onlyIn(d, /^\.(pds|docks)\b/) },
  // The old model keeps a rival's points twice (my opponentVp, its own vp) and a status entry moves only the first.
  { reason: 'a rival has its points in two places (a status entry, a component that scores for a rival)', matches: (_, d) => onlyIn(d, /^\.(rivals\.[^.]+\.vp|opponentVp\.[^.:]+):?/) },
  // A technology played without being held is exhausted in the old list; a board holds no card that is not there.
  { reason: 'an exhausted technology that is not held', matches: (_, d) => onlyIn(d, /^.(rivals.[^.]+.)?holdings.exhausted:/) },
];

/** Differences found and not explained: none. A new one must be explained (a kernel fix, or an entry in EXCLUSIONS / TAINTS with the rule) and listed in docs/superpowers/specs/2026-11-13-game-model-differences.md. */
const KNOWN_OPEN = { entry: 0, whole: 0 };

interface Result { outcome: Outcome; detail?: Detail }
const single: Result[] = [];
const whole: Result[] = [];
const seen = new WeakSet<Game>();
let games = 0;

function onGame(game: Game, pack: DataPack): void {
  if (seen.has(game)) return;
  seen.add(game);
  games += 1;
  const label = `g${games}`;
  const one = compareGame(game, pack, label);
  for (const outcome of one.outcomes) single.push({ outcome, detail: one.details.get(outcome) });
  for (const plan of game.plans) {
    for (const filter of ['forecast', 'now'] as const) {
      const all = compareTimelines(game, pack, `${label}/${plan.name}`, plan, filter);
      for (const outcome of all.outcomes) whole.push({ outcome, detail: all.details.get(outcome) });
    }
  }
}
watchGames(onGame);
watchProjects(onGame);

// The tests that build games, run with the watchers on.
// (094-note-refused swaps a component into the shared registry and cannot share a module graph.)
const RULES = import.meta.glob(['../../domain/rules/lrr/*.test.ts', '!../../domain/rules/lrr/094-note-refused.test.ts'], { eager: true });
const COMPONENTS = import.meta.glob('../../domain/effects/components/**/*.test.ts', { eager: true });
void RULES; void COMPONENTS;

/** The real game, when the file is there: the plans are the player's own and not part of the repository. */
const REAL = import.meta.glob<string>('/plans/slezy-radosti-2026-11-14.ti4.json', { query: '?raw', import: 'default', eager: true });

describe('the real game', () => {
  (Object.keys(REAL).length > 0 ? test : test.skip)('every entry of every plan, mine and the rivals', () => {
    const game = JSON.parse(Object.values(REAL)[0]) as Game;
    const pack = loadPack(game.expansions);
    for (const plan of game.plans) {
      const { outcomes, details } = compareGame(game, pack, `real-${plan.name}`, plan);
      for (const outcome of outcomes) single.push({ outcome, detail: details.get(outcome) });
      for (const filter of ['forecast', 'now'] as const) {
        const all = compareTimelines(game, pack, `real-${plan.name}`, plan, filter);
        for (const outcome of all.outcomes) whole.push({ outcome, detail: all.details.get(outcome) });
      }
    }
  });
});

function describeOpen(results: Result[]): { open: Result[]; lines: string } {
  const open = results.filter(r => !r.outcome.agree && !EXCLUSIONS.some(e => r.detail && e.matches(r.outcome, r.detail)));
  const lines = open.slice(0, 12).map(({ outcome, detail }) => [
    `${outcome.game} ${outcome.entry} (${outcome.type}): ${outcome.diffs.join(', ')}`,
    outcome.detail ?? '',
    ...(outcome.diffs.includes('state') && detail ? whereDiffers(detail.oldState, detail.newState) : []),
    ...(outcome.diffs.includes('warnings') && detail ? [`old warnings ${JSON.stringify(detail.oldWarnings)}`, `new warnings ${JSON.stringify(detail.newWarnings)}`] : []),
  ].filter(Boolean).join('\n  '));
  const signature = new Map<string, string[]>();
  for (const { outcome, detail } of open) {
    const changed = detail ? [...detail.oldWarnings, ...detail.newWarnings].filter(w => !(detail.oldWarnings.includes(w) && detail.newWarnings.includes(w))).map(w => w.slice(2, 22)).join('|') : '';
    const first = detail && outcome.diffs.includes('state') ? whereDiffers(detail.oldState, detail.newState)[0]?.split(': old')[0] : changed || (outcome.detail?.slice(0, 60) ?? '');
    const key = `${outcome.type} ${outcome.diffs.join(',')} ${first}`;
    signature.set(key, [...(signature.get(key) ?? []), `${outcome.game}:${outcome.entry}`]);
  }
  console.log([...signature].map(([k, v]) => `${v.length} ${k}  e.g. ${v[0]}`).join('\n'));
  return { open, lines: lines.join('\n') };
}

const byType = (results: Result[]): string => {
  const count = new Map<string, number>();
  for (const { outcome } of results) count.set(outcome.type, (count.get(outcome.type) ?? 0) + 1);
  return [...count].map(([type, n]) => `${type} ${n}`).join(', ');
};

describe('what the two models agree on', () => {
  test('every entry, on a board rebuilt from the old frame before it, resolves to the old frame after it', () => {
    const { open, lines } = describeOpen(single);
    console.log(`differential, entry by entry: ${games} games, ${single.length} entries (${byType(single)}); ${single.filter(r => r.outcome.agree).length} agree, ${open.length} open`);
    expect(open.length, lines).toBeLessThanOrEqual(KNOWN_OPEN.entry);
  });

  test('the kernel timeline agrees with the old one after every entry of every plan, in now and in forecast', () => {
    const { open, lines } = describeOpen(whole);
    const set = whole.filter(r => r.outcome.excluded);
    console.log(`differential, whole plans: ${whole.length} entries (${byType(whole)}); ${whole.filter(r => r.outcome.agree).length} agree, ${set.length} of them with a known difference set aside, ${open.length} open`);
    expect(open.length, lines).toBeLessThanOrEqual(KNOWN_OPEN.whole);
  });

  test('the corpus is the whole of what the tests and the real game hold', () => {
    expect(single.length).toBeGreaterThan(1000);
    expect(whole.length).toBeGreaterThan(1000);
  });
});
