import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../testing/entries';

vi.mock('../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
}));

import { loadPack } from '../data/loadPack';
import { withRoute as oldRoute } from '../domain/tactical';
import { withLanding as oldLanding } from '../testing/old/domain/tactical';
import type { Entry } from '../testing/old/domain/types';
import { withLanding, withRoute } from '../game/edit/tactical';
import { newTurn } from '../game/edit/new';
import { tacticalBody } from '../testing/old/domain/newEntry';
import { planOf, tableOf } from '../testing/old/game/fromLegacy';
import { initialBoard } from '../game/setup';
import { mapSource } from '../game/space';
import { entryPatch } from '../ui/testing/turnProps';
import { addTactical, pruneEmptySources } from './turnBridge';
import { writeTurn } from '../testing/writeTurn';
import { useGame } from './gameStore';
import { gameNow } from '../testing/store';

const pack = loadPack(['pok']);
const act = () => useGame.getState();
const entries = (): Entry[] => gameNow()!.plans.find(p => p.id === gameNow()!.activePlanId)!.rounds[0].entries;

beforeEach(() => {
  act().newGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  act().setTile('A', '19'); act().setTile('B', '20'); act().setTile('C', '26');
});

describe('the write bridge', () => {
  test('a turn edited by the kernel is stored as the old writer stores it', () => {
    const [pa] = pack.tiles['20'].planetIds;
    const id = edits.addEntry(1, { type: 'tactical', systemId: 'B', moves: [{ from: 'A', units: { carrier: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    const game = gameNow()!;
    const table = tableOf(game);
    const at = { map: mapSource(table, initialBoard(table, pack)), pack };
    const bridge = writeTurn(table, game, id, pack)!;
    bridge.update(withLanding(withRoute(at, bridge.turn, 'A', ['C']), pa, 'infantry', 2));
    const stored = entries().find(e => e.id === id) as Extract<Entry, { type: 'tactical' }>;
    const old = entries()[0] as Extract<Entry, { type: 'tactical' }>;
    expect(stored).toBe(old);
    expect(stored.moves).toEqual(oldRoute(game, pack, [{ from: 'A', units: { carrier: 1 } }], 'A', ['C']));
    expect(stored.landings).toEqual(oldLanding({ landings: [] } as never, pa, 'infantry', 2).landings);
  });

  test('an edit that changes nothing writes nothing', () => {
    const id = edits.addEntry(1, { type: 'pass' }, 'action');
    const game = gameNow()!;
    const bridge = writeTurn(tableOf(game), game, id, pack)!;
    bridge.update(bridge.turn);
    expect(gameNow()).toBe(game);
  });

  test('the patch names the changed fields and the removed ones', () => {
    const a = { id: 'x', type: 'pass', phase: 'action', status: 'planned', gains: ['a'] } as Entry;
    const b = { id: 'x', type: 'pass', phase: 'action', status: 'planned', spends: ['b'] } as Entry;
    expect(entryPatch(a, b)).toEqual({ gains: undefined, spends: ['b'] });
  });
});

describe('the free action of a card', () => {
  test('made with the card and dropped with it, as the store makes and drops it', () => {
    const card = edits.addEntry(1, { type: 'strategic', card: 6 }, 'action');
    const game = gameNow()!;
    const table = tableOf(game);
    const round = planOf(table, game.plans[0], pack)[0];
    const bridge = writeTurn(table, game, card, pack)!;
    const free = newTurn('tactical', { id: 'n', player: 'p1', viewer: 'p1', round }, { system: 'B', byCard: card });
    bridge.update({ ...bridge.turn, action: { ...(bridge.turn.action as object), nested: [free] } as never });
    const made = entries().find(e => e.type === 'tactical') as Extract<Entry, { type: 'tactical' }>;
    expect(made).toMatchObject({ ...tacticalBody('B', card), id: expect.any(String) });
    const again = writeTurn(table, gameNow()!, card, pack)!;
    again.update({ ...again.turn, action: { ...(again.turn.action as object), nested: undefined } as never });
    expect(entries().some(e => e.type === 'tactical')).toBe(false);
  });
});

describe('a new tactical action and the sources left empty', () => {
  test('stored as the old body is, with the owner and the card', () => {
    const table = tableOf(gameNow()!);
    const mine = edits.addEntry(1, tacticalBody('B'), 'action');
    const made = addTactical(table, 1, 'B', undefined, undefined);
    expect(entries().find(e => e.id === made)).toEqual({ ...entries().find(e => e.id === mine), id: made });
    const card = edits.addEntry(1, { type: 'strategic', card: 6 }, 'action');
    const oldFree = edits.addEntry(1, tacticalBody('B', card), 'action', undefined);
    const free = addTactical(table, 1, 'B', undefined, card);
    expect(entries().find(e => e.id === free)).toEqual({ ...entries().find(e => e.id === oldFree), id: free });
  });

  test('an empty source goes, a source with units stays', () => {
    const id = edits.addEntry(1, { type: 'tactical', systemId: 'B', moves: [{ from: 'A', units: {} }, { from: 'C', units: { cruiser: 1 } }, { from: 'A', units: {}, pickupOf: 'C' }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    pruneEmptySources(id);
    expect((entries().find(e => e.id === id) as Extract<Entry, { type: 'tactical' }>).moves).toEqual([{ from: 'C', units: { cruiser: 1 } }]);
  });
});
