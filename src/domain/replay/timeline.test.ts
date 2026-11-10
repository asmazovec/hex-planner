import { describe, expect, test } from 'vitest';
import { project, stateAfterEntry, stateBeforeEntry } from '../project';
import type { Game } from '../types';
import { timeline, type Timeline } from './timeline';
import { editRound, fixturePack as pack, longGame } from './timelineFixture';

const planOf = (game: Game) => game.plans[0];
const line = (game: Game, filter: 'now' | 'forecast' = 'forecast', previous?: Timeline) => timeline(game, planOf(game), filter, pack, previous);
/** What a timeline says, without how it was reached. */
const told = (t: Timeline) => ({ frames: t.frames, end: t.end });

describe('the timeline of a plan', () => {
  const game = longGame(4, 2);

  test('frames follow the replay order and end equals project().state', () => {
    const t = line(game);
    expect(t.end).toEqual(project(game, planOf(game), 'forecast', pack).state);
    const ids = t.frames.map(f => f.entryId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(planOf(game).rounds.flatMap(r => r.entries).length);
    expect(ids[0]).toBe('r1-card');
    expect(ids.at(-1)).toBe('r4-status');
  });

  test('within a round the board before a frame is the board after the one before it', () => {
    const t = line(game);
    const first = t.frames.findIndex(f => f.entryId === 'r2-card');
    const last = t.frames.findIndex(f => f.entryId === 'r2-pass');
    for (let i = first + 1; i <= last; i++) expect(t.frames[i].before).toBe(t.frames[i - 1].after);
  });

  test('an entry the replay passes over changes nothing and has no warnings', () => {
    const t = line(game, 'now');
    const frame = t.byEntry.get('r1-mine1')!;
    expect(frame.applied).toBe(false);
    expect(frame.after).toBe(frame.before);
    expect(t.byEntry.get('r1-mine0')!.applied).toBe(true);
  });

  test('later entries never change an earlier board', () => {
    const t = line(game);
    const early = structuredClone(t.byEntry.get('r1-mine0')!.after);
    line(editRound(game, 4, r => ({ ...r, entries: r.entries.slice(0, 2) })), 'forecast', t);
    expect(t.byEntry.get('r1-mine0')!.after).toEqual(early);
  });

  test('the state before and after an entry are its boards, an opponent seeing their own', () => {
    const t = line(game);
    expect(stateBeforeEntry(game, planOf(game), 'r3-mine1', pack)).toEqual(t.byEntry.get('r3-mine1')!.before);
    const rival = game.opponents[0].id;
    expect(stateAfterEntry(game, planOf(game), `r2-${rival}-1`, pack)).toEqual(t.byEntry.get(`r2-${rival}-1`)!.after.rivals![rival]);
  });
});

describe('a timeline replayed from the first changed round', () => {
  const game = longGame(4, 2);
  const whole = line(game);

  test('an edit of the last round keeps every earlier frame by reference', () => {
    const edited = editRound(game, 4, r => ({ ...r, entries: r.entries.map(e => (e.id === 'r4-fix' ? { ...e, status: 'cancelled' as const } : e)) }));
    const next = line(edited, 'forecast', whole);
    const kept = whole.frames.findIndex(f => f.entryId === 'r4-card');
    expect(kept).toBeGreaterThan(0);
    for (let i = 0; i < kept; i++) expect(next.frames[i]).toBe(whole.frames[i]);
    expect(next.frames[kept]).not.toBe(whole.frames[kept]);
  });

  const edits: [string, (game: Game) => Game][] = [
    ['two entries change places', g => editRound(g, 2, r => ({ ...r, entries: [r.entries[0], r.entries[2], r.entries[1], ...r.entries.slice(3)] }))],
    ['an entry goes', g => editRound(g, 3, r => ({ ...r, entries: r.entries.filter(e => e.id !== 'r3-mine0') }))],
    ['an entry is cancelled', g => editRound(g, 1, r => ({ ...r, entries: r.entries.map(e => (e.id === 'r1-fix' ? { ...e, status: 'cancelled' as const } : e)) }))],
    ['the strategy card of a round changes', g => editRound(g, 2, r => ({ ...r, strategyCard: 5 }))],
    ['a round is added', g => ({ ...g, plans: g.plans.map(p => ({ ...p, rounds: [...p.rounds, { number: 5, strategyCard: null, backupCard: null, entries: [] }] })) })],
    ['the last round goes', g => ({ ...g, plans: g.plans.map(p => ({ ...p, rounds: p.rounds.slice(0, -1) })) })],
  ];
  test.each(edits)('incremental equals full: %s', (_name, edit) => {
    const edited = edit(game);
    for (const filter of ['forecast', 'now'] as const) {
      expect(told(line(edited, filter, line(game, filter)))).toEqual(told(line(edited, filter)));
    }
  });

  test('a plan that did not change gives the same timeline back', () => {
    expect(line(game, 'forecast', whole)).toBe(whole);
    expect(line({ ...game, name: 'renamed' }, 'forecast', whole).frames).toBe(whole.frames);
  });

  test('a change of the game outside the plan keeps nothing', () => {
    const moved = { ...game, enemyUnits: { ...game.enemyUnits } };
    const next = line(moved, 'forecast', whole);
    expect(next.frames[0]).not.toBe(whole.frames[0]);
    expect(told(next)).toEqual(told(line(moved)));
  });

  test('a timeline of the other filter keeps nothing', () => {
    expect(told(line(game, 'now', whole))).toEqual(told(line(game, 'now')));
  });
});
