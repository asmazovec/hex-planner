import { describe, expect, test } from 'vitest';
import { apply, applyAll, applyChecked } from './apply';
import { bareBoard } from './testTable';
import type { GameEvent } from './events';

const ship = (units: object): GameEvent => ({ type: 'UnitsPlaced', player: 'p1', at: { slot: '0,0' }, units });

describe('units', () => {
  test('placed in space, moved to a planet and removed', () => {
    const board = applyAll(bareBoard(), [
      ship({ carrier: 2, infantry: 3 }),
      { type: 'UnitsMoved', player: 'p1', from: { slot: '0,0' }, to: { planet: 'x' }, units: { infantry: 2 } },
      { type: 'UnitsRemoved', player: 'p1', at: { slot: '0,0' }, units: { carrier: 1 }, reason: 'combat' },
    ]);
    expect(board.systems['0,0'].ships.p1).toEqual({ carrier: 1, infantry: 1 });
    expect(board.planets.x.ground.p1).toEqual({ infantry: 2 });
  });

  test('removing what is not there clamps at zero and reports the shortfall', () => {
    const start = apply(bareBoard(), ship({ carrier: 1 }));
    const { board, shortfall } = applyChecked(start, { type: 'UnitsRemoved', player: 'p1', at: { slot: '0,0' }, units: { carrier: 3, cruiser: 1 } });
    expect(board.systems['0,0'].ships.p1).toEqual({});
    expect(shortfall).toEqual([
      { what: 'units', player: 'p1', where: '0,0', key: 'carrier', missing: 2 },
      { what: 'units', player: 'p1', where: '0,0', key: 'cruiser', missing: 1 },
    ]);
  });

  test('a move of more than stands there moves what there is and reports the rest', () => {
    const start = apply(bareBoard(), ship({ carrier: 1 }));
    const { board, shortfall } = applyChecked(start, { type: 'UnitsMoved', player: 'p1', from: { slot: '0,0' }, to: { slot: '1,0' }, units: { carrier: 2 } });
    expect(board.systems['1,0'].ships.p1).toEqual({ carrier: 1 });
    expect(shortfall?.[0]).toMatchObject({ key: 'carrier', missing: 1 });
  });

  test('unrelated parts of the board are shared, not copied', () => {
    const start = applyAll(bareBoard(), [ship({ carrier: 1 }), { type: 'TradeGoodsChanged', player: 'p2', delta: 2 }]);
    const next = apply(start, { type: 'TradeGoodsChanged', player: 'p1', delta: 1 });
    expect(next.players.p2).toBe(start.players.p2);
    expect(next.systems).toBe(start.systems);
    expect(start.players.p1.tradeGoods).toBe(0);
  });
});

describe('planets and structures', () => {
  test('a planet gained by another player loses the structures of the old owner', () => {
    const board = applyAll(bareBoard(), [
      { type: 'PlanetGained', player: 'p1', planet: 'x' },
      { type: 'StructurePlaced', player: 'p1', at: { planet: 'x' }, structures: { spacedock: 1, pds: 1 } },
      { type: 'PlanetGained', player: 'p2', planet: 'x' },
    ]);
    expect(board.planets.x.owner).toBe('p2');
    expect(board.planets.x.structures).toEqual({});
  });

  test('structures carried afloat land on a planet', () => {
    const board = applyAll(bareBoard(), [
      { type: 'PlanetGained', player: 'p1', planet: 'x' },
      { type: 'StructurePlaced', player: 'p1', at: { slot: '0,0' }, structures: { pds: 1 } },
      { type: 'StructureMoved', player: 'p1', from: { slot: '0,0' }, to: { planet: 'x' }, structures: { pds: 1 } },
    ]);
    expect(board.systems['0,0'].afloat.p1).toEqual({});
    expect(board.planets.x.structures).toEqual({ pds: 1 });
  });

  test('a structure on a planet its player does not hold is not placed, and is reported', () => {
    const { board, shortfall } = applyChecked(bareBoard(), { type: 'StructurePlaced', player: 'p1', at: { planet: 'x' }, structures: { pds: 1 } });
    expect(board.planets.x?.structures ?? {}).toEqual({});
    expect(shortfall).toEqual([{ what: 'owner', player: 'p1', where: 'x', key: 'pds', missing: 1 }]);
  });

  test('exhausting and readying', () => {
    const board = applyAll(bareBoard(), [
      { type: 'PlanetGained', player: 'p1', planet: 'x' }, { type: 'PlanetExhausted', player: 'p1', planet: 'x' },
    ]);
    expect(board.planets.x.exhausted).toBe(true);
    expect(apply(board, { type: 'PlanetReadied', player: 'p1', planet: 'x' }).planets.x.exhausted).toBe(false);
  });
});

describe('goods, tokens, points', () => {
  test('a transfer moves trade goods and cards; commodities arrive as trade goods', () => {
    const board = applyAll(bareBoard(), [
      { type: 'TradeGoodsChanged', player: 'p1', delta: 3 }, { type: 'CommoditiesChanged', player: 'p1', delta: 2 },
      { type: 'CardGained', player: 'p1', card: 'promissory:a@p1' },
      { type: 'GoodsTransferred', from: 'p1', to: 'p2', tradeGoods: 1, commodities: 2, cards: ['promissory:a@p1'] },
    ]);
    expect(board.players.p1).toMatchObject({ tradeGoods: 2, commodities: 0, cards: {} });
    expect(board.players.p2).toMatchObject({ tradeGoods: 3, cards: { 'promissory:a@p1': { state: 'ready', count: 1 } } });
  });

  test('spending more trade goods than held clamps and reports', () => {
    const { board, shortfall } = applyChecked(bareBoard(), { type: 'TradeGoodsChanged', player: 'p1', delta: -2 });
    expect(board.players.p1.tradeGoods).toBe(0);
    expect(shortfall).toEqual([{ what: 'tradeGoods', player: 'p1', key: 'tradeGoods', missing: 2 }]);
  });

  test('pools change by signed amounts; activation puts a token on the map once', () => {
    const board = applyAll(bareBoard(), [
      { type: 'TokensChanged', player: 'p1', delta: { tactic: 3, fleet: 3, strategy: 2 } },
      { type: 'TokensChanged', player: 'p1', delta: { tactic: -1, fleet: 2 } },
      { type: 'SystemActivated', player: 'p1', system: '0,0' }, { type: 'SystemActivated', player: 'p1', system: '0,0' },
    ]);
    expect(board.players.p1.pools).toEqual({ tactic: 2, fleet: 5, strategy: 2 });
    expect(board.systems['0,0'].tokens).toEqual(['p1']);
    expect(apply(board, { type: 'TokenReturned', player: 'p1' }).systems['0,0'].tokens).toEqual([]);
  });

  test('spending more tokens than the pool holds clamps and reports', () => {
    const { board, shortfall } = applyChecked(bareBoard(), { type: 'TokensChanged', player: 'p1', delta: { tactic: -1 } });
    expect(board.players.p1.pools.tactic).toBe(0);
    expect(shortfall).toEqual([{ what: 'tokens', player: 'p1', key: 'tactic', missing: 1 }]);
  });

  test('points and speaker', () => {
    const board = applyAll(bareBoard(), [{ type: 'PointsChanged', player: 'p2', delta: 2 }, { type: 'SpeakerChanged', player: 'p3' }]);
    expect(board.players.p2.vp).toBe(2);
    expect(board.speaker).toBe('p3');
  });
});

describe('cards, laws, strategy', () => {
  test('copies, exhaust, ready, purge', () => {
    let board = applyAll(bareBoard(), [
      { type: 'CardGained', player: 'p1', card: 'actionCard:a', count: 2 }, { type: 'CardExhausted', player: 'p1', card: 'actionCard:a' },
    ]);
    expect(board.players.p1.cards['actionCard:a']).toEqual({ state: 'exhausted', count: 2 });
    board = applyAll(board, [{ type: 'CardReadied', player: 'p1', card: 'actionCard:a' }, { type: 'CardLost', player: 'p1', card: 'actionCard:a' }]);
    expect(board.players.p1.cards['actionCard:a']).toEqual({ state: 'ready', count: 1 });
    board = apply(board, { type: 'CardPurged', player: 'p1', card: 'actionCard:a' });
    expect(board.players.p1.cards['actionCard:a'].state).toBe('purged');
  });

  test('a law and its attachment go together', () => {
    const board = applyAll(bareBoard(), [
      { type: 'LawEnacted', law: 'agenda:l', elected: 'p2' }, { type: 'CardAttached', planet: 'x', card: 'agenda:l' },
    ]);
    expect(board.common.laws).toEqual([{ id: 'agenda:l', elected: 'p2' }]);
    const gone = apply(board, { type: 'LawDiscarded', law: 'agenda:l' });
    expect(gone.common.laws).toEqual([]);
    expect(gone.planets.x.attached).toEqual([]);
  });

  test('a new round clears passes and strategy cards', () => {
    const board = applyAll(bareBoard(), [
      { type: 'StrategyCardPicked', player: 'p1', card: 3 }, { type: 'StrategyCardPlayed', player: 'p1', card: 3 }, { type: 'Passed', player: 'p1' },
    ]);
    expect(board.players.p1).toMatchObject({ strategy: [{ card: 3, played: true }], passed: true });
    const next = apply(board, { type: 'RoundStarted', round: 2 });
    expect(next).toMatchObject({ round: 2, phase: 'strategy' });
    expect(next.players.p1).toMatchObject({ strategy: [], passed: false });
  });

  test('objectives, custodians, expedition, fracture, wormhole tokens', () => {
    const board = applyAll(bareBoard(), [
      { type: 'ObjectiveRevealed', objective: 'publicObjective:o' }, { type: 'ObjectiveScored', player: 'p1', objective: 'publicObjective:o' },
      { type: 'CustodiansRemoved', player: 'p1' }, { type: 'ExpeditionSliceTaken', player: 'p2', slice: 'a' },
      { type: 'FractureOpened', tiles: { f1: '1' } }, { type: 'WormholeTokenPlaced', system: '0,0', wormhole: 'alpha' },
    ]);
    expect(board.common).toMatchObject({ revealed: ['publicObjective:o'], custodians: false, expedition: { a: 'p2' }, fracture: { open: true }, wormholeTokens: { '0,0': ['alpha'] } });
    expect(board.players.p1.cards['publicObjective:o'].state).toBe('inPlay');
  });
});
