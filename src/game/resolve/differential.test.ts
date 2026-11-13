/**
 * The differential test of step 2a: every tactical entry the old replay has, resolved again on the kernel, must give the
 * same board for every player and the same warnings. The corpus is (a) every game the LRR rules tests build (the rules
 * kit tells a watcher of each game it is asked about; the test files are imported here, so their tests run in this file
 * with the watcher on), and (b) the real four-player game in plans/, all plans, mine and the rivals'.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { watchGames } from '../../domain/rules/kit';
import type { Game } from '../../domain/types';
import { compareGame, whereDiffers, type Detail, type Exclusion, type Outcome } from './differential';

/** Cases where the old replay is wrong by the rules, each with its reason; the same list is in docs/superpowers/specs/2026-11-13-game-model-differences.md. */
const onlyIn = (detail: Detail, path: RegExp): boolean => {
  const diffs = whereDiffers(detail.oldState, detail.newState, '', []);
  return diffs.length > 0 && diffs.every(d => path.test(d));
};
export const EXCLUSIONS: Exclusion[] = [
  // A structure belongs to the owner of its planet (the kernel); the old state keeps the one a card built on a planet no one holds.
  { reason: 'structure on a planet no one controls (Construction)', matches: (o, d) => (o.type === 'strategic' || o.type === 'secondary') && onlyIn(d, /^.(pds|docks)./) },
  // The old model keeps a rival's points twice (my opponentVp, its own vp) and a status entry moves only the first.
  { reason: 'a rival has its points in two places (status entry)', matches: (o, d) => o.type === 'statusTokens' && onlyIn(d, /^.rivals.[^.]+.vp:/) },
];

const results: { outcome: Outcome; detail?: Detail }[] = [];
let games = 0;

watchGames((game, pack) => {
  games += 1;
  const { outcomes, details } = compareGame(game, pack, `lrr-${games}`);
  for (const outcome of outcomes) results.push({ outcome, detail: details.get(outcome) });
});

// The rules tests, run with the watcher on.
// (094-note-refused swaps a component into the shared registry and cannot share a module graph.)
const LRR = import.meta.glob(['../../domain/rules/lrr/*.test.ts', '!../../domain/rules/lrr/094-note-refused.test.ts'], { eager: true });
void LRR;

/** The real game, when the file is there: the plans are the player's own and not part of the repository. */
const REAL = import.meta.glob<string>('/plans/slezy-radosti-2026-11-14.ti4.json', { query: '?raw', import: 'default', eager: true });

describe('the real game', () => {
  (Object.keys(REAL).length > 0 ? test : test.skip)('every tactical entry of every plan, mine and the rivals', () => {
    const game = JSON.parse(Object.values(REAL)[0]) as Game;
    const pack = loadPack(game.expansions);
    for (const plan of game.plans) {
      const { outcomes, details } = compareGame(game, pack, `real-${plan.name}`, plan);
      for (const outcome of outcomes) results.push({ outcome, detail: details.get(outcome) });
    }
  });
});

describe('what the two models agree on', () => {
  test('every entry resolves to the old frame after it, with the same warnings', () => {
    const open = results.filter(r => !r.outcome.agree && !EXCLUSIONS.some(e => r.detail && e.matches(r.outcome, r.detail)));
    const lines = open.slice(0, 12).map(({ outcome, detail }) => [
      `${outcome.game} ${outcome.entry} (${outcome.type}): ${outcome.diffs.join(', ')}`,
      outcome.detail ?? '',
      ...(outcome.diffs.includes('state') && detail ? whereDiffers(detail.oldState, detail.newState) : []),
      ...(outcome.diffs.includes('warnings') && detail ? [`old warnings ${JSON.stringify(detail.oldWarnings)}`, `new warnings ${JSON.stringify(detail.newWarnings)}`] : []),
    ].filter(Boolean).join('\n  '));
    const signature = new Map<string, number>();
    for (const { outcome, detail } of open) {
      const key = outcome.diffs.includes('state') && detail ? `state${whereDiffers(detail.oldState, detail.newState)[0]?.split(': old')[0]}` : outcome.diffs.join(',');
      signature.set(key, (signature.get(key) ?? 0) + 1);
    }
    console.log([...signature].map(([k, n]) => `${n} ${k}`).join('\n'));
    const real = results.filter(r => r.outcome.game.startsWith('real-'));
    console.log(`differential: ${games} rules games, ${results.length - real.length} rules entries; real game: ${real.length} tactical entries in ${new Set(real.map(r => r.outcome.game)).size} plans; ${results.filter(r => r.outcome.agree).length} of ${results.length} agree, ${open.length} open`);
    expect(open.length, lines.join('\n')).toBe(0);
  });

  test('the corpus is the whole of what the rules tests and the real game hold', () => {
    const real = results.filter(r => r.outcome.game.startsWith('real-'));
    // 634 rules games and 428 tactical entries in them, 103 entries of the real game's 4 plans, when this was written.
    expect(results.length - real.length).toBeGreaterThan(400);
    if (Object.keys(REAL).length > 0) expect(real.length).toBeGreaterThan(90);
  });
});
