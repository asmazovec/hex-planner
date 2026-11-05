import { describe, expect, test } from 'vitest';
import { changeMerged, mergedCounts, mergedEntry } from './losses';
import type { AdjustmentKind, Entry, Round, UnitId } from './types';

const SLOT = '1,0';
const emptyRound = (): Round => ({ number: 1, strategyCard: null, backupCard: null, entries: [] });
let ids = 0;
const newId = () => `id${(ids += 1)}`;
const change = (round: Round, kind: AdjustmentKind, unit: UnitId, amount: number, planetId: string | null = null, systemId = SLOT) =>
  changeMerged(round, { kind, systemId, unit, planetId, amount }, newId);

describe('losses merge into one entry per system', () => {
  test('the first loss creates a planned adjustment in the action phase, marked as losses', () => {
    const [entry] = change(emptyRound(), 'losses', 'carrier', -1).entries;
    expect(entry).toMatchObject({
      type: 'adjustment', kind: 'losses', phase: 'action', status: 'planned', label: '',
      delta: { units: { systemId: SLOT, units: { carrier: -1 } } },
    });
  });

  test('later losses in the system go into the same entry', () => {
    let round = change(emptyRound(), 'losses', 'carrier', -1);
    round = change(round, 'losses', 'carrier', -1);
    round = change(round, 'losses', 'fighter', -1);
    expect(round.entries).toHaveLength(1);
    expect(mergedEntry(round, 'losses', SLOT)?.delta.units?.units).toEqual({ carrier: -2, fighter: -1 });
  });

  test('another system gets its own entry', () => {
    let round = change(emptyRound(), 'losses', 'carrier', -1);
    round = change(round, 'losses', 'carrier', -1, null, '0,1');
    expect(round.entries).toHaveLength(2);
  });

  test('ground losses are kept by planet', () => {
    let round = change(emptyRound(), 'losses', 'infantry', -1, 'quann');
    round = change(round, 'losses', 'infantry', -1, 'lodor');
    round = change(round, 'losses', 'mech', -1, 'quann');
    expect(round.entries).toHaveLength(1);
    expect(mergedEntry(round, 'losses', SLOT)?.delta.ground).toEqual({ quann: { infantry: -1, mech: -1 }, lodor: { infantry: -1 } });
  });

  test('taking back the last loss removes the entry', () => {
    let round = change(emptyRound(), 'losses', 'carrier', -1);
    round = change(round, 'losses', 'infantry', -1, 'quann');
    round = change(round, 'losses', 'carrier', 1);
    expect(round.entries).toHaveLength(1);
    round = change(round, 'losses', 'infantry', 1, 'quann');
    expect(round.entries).toEqual([]);
  });

  test('a planet with nothing left leaves the delta', () => {
    let round = change(emptyRound(), 'losses', 'infantry', -1, 'quann');
    round = change(round, 'losses', 'carrier', -1);
    round = change(round, 'losses', 'infantry', 1, 'quann');
    expect(mergedEntry(round, 'losses', SLOT)?.delta).toEqual({ units: { systemId: SLOT, units: { carrier: -1 } } });
  });

  test('other entries of the round stay where they are, and the kinds do not mix', () => {
    const other: Entry = { id: 'x', phase: 'action', status: 'planned', type: 'adjustment', label: 'card', delta: { units: { systemId: SLOT, units: {} } } };
    let round: Round = { ...emptyRound(), entries: [other] };
    round = change(round, 'losses', 'carrier', -1);
    round = change(round, 'build', 'carrier', 1);
    expect(round.entries).toHaveLength(3);
    expect(round.entries[0]).toBe(other);
    round = change(round, 'losses', 'carrier', 1);
    expect(round.entries.map(e => e.id)).toContain('x');
    expect(mergedEntry(round, 'build', SLOT)).toBeDefined();
  });

  test('a cancelled entry takes no more changes', () => {
    const round = change(emptyRound(), 'losses', 'carrier', -1);
    const cancelled: Round = { ...round, entries: round.entries.map(e => ({ ...e, status: 'cancelled' as const })) };
    const next = change(cancelled, 'losses', 'carrier', -1);
    expect(next.entries).toHaveLength(2);
  });

  test('an entry keeps its status when it changes', () => {
    const round = change(emptyRound(), 'losses', 'carrier', -1);
    const done: Round = { ...round, entries: round.entries.map(e => ({ ...e, status: 'done' as const })) };
    expect(change(done, 'losses', 'fighter', -1).entries[0].status).toBe('done');
  });

  test('no change returns the same round', () => {
    const round = emptyRound();
    expect(change(round, 'losses', 'carrier', 0)).toBe(round);
  });
});

describe('setup is signed', () => {
  test('a setup entry records the board and counts as done', () => {
    expect(change(emptyRound(), 'setup', 'cruiser', 1).entries[0]).toMatchObject({ kind: 'setup', status: 'done' });
  });

  test('it may hold negative counts and goes when it nets to nothing', () => {
    let round = change(emptyRound(), 'setup', 'cruiser', -1);
    expect(mergedEntry(round, 'setup', SLOT)?.delta.units?.units).toEqual({ cruiser: -1 });
    round = change(round, 'setup', 'cruiser', 1);
    expect(round.entries).toEqual([]);
  });

  test('counts come out signed, in space and by planet', () => {
    let round = change(emptyRound(), 'setup', 'cruiser', 2);
    round = change(round, 'setup', 'infantry', -1, 'quann');
    expect(mergedCounts(round, 'setup', SLOT)).toEqual([
      { unit: 'cruiser', planetId: null, count: 2 },
      { unit: 'infantry', planetId: 'quann', count: -1 },
    ]);
  });

  test('a system with no entry has no counts', () => {
    expect(mergedCounts(emptyRound(), 'setup', SLOT)).toEqual([]);
  });
});
