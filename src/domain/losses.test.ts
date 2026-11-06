import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { changeMerged, changeOnBoard, mergedCounts, mergedEntry } from './losses';
import { createGame } from './newGame';
import { project } from './project';
import type { AdjustmentKind, Entry, EntryBody, Game, Phase, Round, UnitId } from './types';

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


describe('a removal must count at the place of its entry', () => {
  const pack = loadPack(['pok']);
  const FROM = '0,1';
  const noPay = { planets: [], tradeGoods: 0 };
  const entry = (body: EntryBody, phase: Phase, id: string): Entry => ({ ...body, id, phase, status: 'planned' }) as Entry;
  const start = (entries: Entry[]): { game: Game; round: Round } => {
    const game = createGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
    game.map[SLOT] = '25';
    game.map[FROM] = '26';
    const round = { ...game.plans[0].rounds[0], entries };
    game.plans[0].rounds[0] = round;
    return { game, round };
  };
  const forecast = (game: Game, round: Round) => {
    const plan = { ...game.plans[0], rounds: [round] };
    return project({ ...game, plans: [plan] }, plan, 'forecast', pack).state;
  };
  const remove = (game: Game, round: Round, unit: UnitId, planetId: string | null = null, kind: AdjustmentKind = 'losses') =>
    changeOnBoard(game, round, { kind, systemId: SLOT, unit, planetId, amount: -1 }, pack, newId);
  const startFleet = entry({ type: 'adjustment', label: '', delta: { units: { systemId: FROM, units: { carrier: 1 } } } }, 'strategy', 'fleet');
  const tacticalIn = entry({
    type: 'tactical', systemId: SLOT, moves: [{ from: FROM, units: { carrier: 1 } }], landings: [], production: {}, payment: noPay,
  }, 'action', 'move');
  const earlier = entry({ type: 'adjustment', label: '', kind: 'losses', delta: { units: { systemId: SLOT, units: { fighter: -1 } } } }, 'action', 'merged');
  const fighters = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { fighter: 2 } } } }, 'strategy', 'fighters');

  test('a unit that arrives by a later tactical entry: the entry moves behind it and the unit goes', () => {
    const { game, round } = start([startFleet, fighters, earlier, tacticalIn]);
    const next = remove(game, round, 'carrier');
    expect(next.entries.map(e => e.id)).toEqual(['fleet', 'fighters', 'move', 'merged']);
    expect(forecast(game, next).systems[SLOT]).toEqual({ fighter: 1 });
    expect(mergedEntry(next, 'losses', SLOT)?.delta.units?.units).toEqual({ fighter: -1, carrier: -1 });
  });

  test('a unit added by an adjustment of a later phase: the entry follows it there', () => {
    const later = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { carrier: 1 } } } }, 'status', 'later');
    const { game, round } = start([fighters, earlier, later]);
    const next = remove(game, round, 'carrier');
    expect(mergedEntry(next, 'losses', SLOT)?.phase).toBe('status');
    expect(next.entries.map(e => e.id)).toEqual(['fighters', 'later', 'merged']);
    expect(forecast(game, next).systems[SLOT]).toEqual({ fighter: 1 });
  });

  test('a new entry too: it stands where the removal counts', () => {
    const later = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { carrier: 1 } } } }, 'status', 'later');
    const { game, round } = start([later]);
    const next = remove(game, round, 'carrier');
    expect(mergedEntry(next, 'losses', SLOT)?.phase).toBe('status');
    expect(forecast(game, next).systems[SLOT]).toEqual({});
  });

  test('a ground unit landed later: its removal counts as well', () => {
    const planet = pack.tiles['25'].planetIds[0];
    const fleet = entry({ type: 'adjustment', label: '', delta: { units: { systemId: FROM, units: { carrier: 1, infantry: 1 } } } }, 'strategy', 'fleet');
    const land = entry({
      type: 'tactical', systemId: SLOT, moves: [{ from: FROM, units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: planet, units: { infantry: 1 } }], production: {}, payment: noPay,
    }, 'action', 'move');
    const { game, round } = start([fleet, fighters, earlier, land]);
    const next = remove(game, round, 'infantry', planet);
    expect(next.entries.map(e => e.id)).toEqual(['fleet', 'fighters', 'move', 'merged']);
    expect(forecast(game, next).ground[planet]).toEqual({});
  });

  test('a removal that already counts leaves the entry where it is', () => {
    const { game, round } = start([startFleet, fighters, earlier, tacticalIn]);
    const next = remove(game, round, 'fighter');
    expect(next.entries.map(e => e.id)).toEqual(['fleet', 'fighters', 'merged', 'move']);
    expect(forecast(game, next).systems[SLOT]).toEqual({ carrier: 1 });
  });

  test('a removal of what nobody has writes no ghost', () => {
    const { game, round } = start([fighters]);
    expect(remove(game, round, 'dreadnought')).toBe(round);
  });

  test('taking a purchase back that nets to nothing removes the entry', () => {
    const { game, round } = start([]);
    const bought = changeOnBoard(game, round, { kind: 'build', systemId: SLOT, unit: 'carrier', planetId: null, amount: 1 }, pack, newId);
    expect(remove(game, bought, 'carrier', null, 'build').entries).toEqual([]);
  });

  test('a move that would drop another loss is refused: a fighter lost, a later tactical moving them out, then a carrier in', () => {
    const out = entry({
      type: 'tactical', systemId: FROM, moves: [{ from: SLOT, units: { fighter: 2 } }], landings: [], production: {}, payment: noPay,
    }, 'action', 'out');
    const { game, round } = start([startFleet, fighters, earlier, out, tacticalIn]);
    // The loss leaves one fighter to fly. Behind the flight it would hit nothing, and both would arrive.
    expect(forecast(game, round).systems[FROM]).toEqual({ fighter: 1 });
    expect(forecast(game, round).systems[SLOT]).toEqual({ carrier: 1 });
    expect(remove(game, round, 'carrier')).toBe(round);
  });
});
