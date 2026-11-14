/**
 * Records the frozen oracle (see oracle.ts) from the kernel itself: `ORACLE_RECORD=1 npx vitest run src/game/resolve/record.test.ts`
 * replays every game the tests build (the LRR rules tests and the component tests, through the watchers of the rules kit and of
 * `project`) and the real game when its file is there, and writes the board and warning hash after every entry. Without the
 * variable the file does nothing. A mark that changes in a later commit is a bug of that commit unless a rule explains it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { watchProjects } from '../../testing/old/domain/project';
import { watchGames } from '../../domain/rules/kit';
import type { DataPack, Game } from '../../domain/types';
import { fixtureOf, marksOf, packBaseOf, packOf, type Case } from '../../testing/old/game/resolve/oracle';

const recording = Boolean(process.env.ORACLE_RECORD);
const recorded: Case[] = [];
const seen = new WeakSet<Game>();

function onGame(game: Game, pack: DataPack): void {
  if (seen.has(game)) return;
  seen.add(game);
  const item: Case = { expansions: game.expansions, ...packBaseOf(pack), game: JSON.parse(JSON.stringify(game)) as Game, runs: [] };
  for (const plan of game.plans) {
    for (const filter of ['forecast', 'now'] as const) item.runs.push({ plan: plan.id, filter, marks: marksOf(item.game, pack, item.game.plans.find(p => p.id === plan.id)!, filter) });
  }
  // A test may give its pack an effect of its own through the registry (not data): such a game cannot be rebuilt from data, and is left out.
  const rebuilt = packOf(item);
  const key = (marks: Case['runs'][number]['marks']): string => JSON.stringify(marks.map(m => m.slice(0, 3)));
  if (item.runs.every(run => key(marksOf(item.game, rebuilt, item.game.plans.find(p => p.id === run.plan)!, run.filter)) === key(run.marks))) recorded.push(item);
}

if (recording) {
  watchGames(onGame);
  watchProjects(onGame);
}
// (094-note-refused swaps a component into the shared registry and cannot share a module graph.)
const RULES = recording ? import.meta.glob(['../../domain/rules/lrr/*.test.ts', '!../../domain/rules/lrr/094-note-refused.test.ts'], { eager: true }) : {};
const COMPONENTS = recording ? import.meta.glob('../../domain/effects/components/**/*.test.ts', { eager: true }) : {};
void RULES; void COMPONENTS;

const REAL = recording ? import.meta.glob<string>('/plans/slezy-radosti-2026-11-14.ti4.json', { query: '?raw', import: 'default', eager: true }) : {};

describe('record the oracle', () => {
  test.runIf(recording)('the real game and the file', () => {
    for (const raw of Object.values(REAL)) {
      const game = JSON.parse(raw) as Game;
      onGame(game, loadPack(game.expansions));
    }
    const dir = 'src/game/resolve/__oracle__';
    mkdirSync(dir, { recursive: true });
    writeFileSync(dir + '/corpus.json.gz', gzipSync(JSON.stringify(fixtureOf(recorded.filter(c => c.runs.length > 0)))));
  });
});
