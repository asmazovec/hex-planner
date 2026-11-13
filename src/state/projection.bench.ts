import { bench, describe } from 'vitest';
import { loadPack } from '../data/loadPack';
import type { Game } from '../domain/types';
import { forgetTimelines, projectionOf, timelineOf } from './projection';

/** The real four-player game when the file is there (the plans are the player's own and not part of the repository). */
const REAL = import.meta.glob<string>('/plans/slezy-radosti-2026-11-14.ti4.json', { query: '?raw', import: 'default', eager: true });
const raw = Object.values(REAL)[0];

if (raw) {
  const game = JSON.parse(raw) as Game;
  const pack = loadPack(game.expansions);
  const plan = [...game.plans].sort((a, b) => b.rounds.flatMap(r => r.entries).length - a.rounds.flatMap(r => r.entries).length)[0];
  const last = plan.rounds[plan.rounds.length - 1];
  const edit = (n: number): Game => ({
    ...game,
    plans: game.plans.map(p => (p.id === plan.id ? { ...p, rounds: p.rounds.map(r => (r === last ? { ...r, entries: r.entries.map(e => ({ ...e, label: `${n}` })) } : r)) } : p)),
  } as Game);
  let n = 0;

  describe(`the real game, plan "${plan.name}", ${plan.rounds.flatMap(r => r.entries).length} entries`, () => {
    bench('kernel: the whole plan, states of every frame read', () => {
      forgetTimelines();
      const line = timelineOf(game, plan, 'forecast', pack);
      projectionOf(line);
      for (const f of line.frames) { void f.before; void f.after; }
    });
    bench('kernel: the whole plan, end and warnings only (what the screens read first)', () => { forgetTimelines(); projectionOf(timelineOf(game, plan, 'forecast', pack)); });
    forgetTimelines();
    timelineOf(game, plan, 'forecast', pack);
    bench('kernel: after an edit of the last round (the timeline of the open game kept)', () => {
      const edited = edit(++n);
      projectionOf(timelineOf(edited, edited.plans.find(p => p.id === plan.id)!, 'forecast', pack));
    });
  });
}
