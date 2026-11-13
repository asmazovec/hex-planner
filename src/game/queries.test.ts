import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { setPlayerFaction } from '../domain/players';
import { tableOf } from './fromLegacy';
import { cardsOf, groundOn, ownerOf, planetsOf, poolsOf, shipsIn, structuresOf } from './queries';
import { initialBoard } from './setup';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const board = initialBoard(tableOf(game), pack);
const [jord] = pack.tiles['1'].planetIds;
const home = Object.keys(board.systems).find(slot => board.systems[slot].ships.p1)!;

describe('what stands where', () => {
  test('shipsIn and groundOn answer for one player', () => {
    expect(shipsIn(board, home, 'p1')).toEqual({ carrier: 2, destroyer: 1, fighter: 3 });
    expect(shipsIn(board, home, 'p2')).toEqual({});
    expect(groundOn(board, jord, 'p1')).toEqual({ infantry: 5 });
    expect(groundOn(board, 'nowhere', 'p1')).toEqual({});
    expect(shipsIn(board, 'nowhere', 'p1')).toEqual({});
  });

  test('ownerOf and planetsOf', () => {
    expect(ownerOf(board, jord)).toBe('p1');
    expect(ownerOf(board, 'nowhere')).toBeUndefined();
    expect(planetsOf(board, 'p1')).toEqual([jord, ...pack.tiles['1'].planetIds.slice(1)].sort());
    expect(planetsOf(board, 'p3')).toEqual([]);
  });

  test('structuresOf lists docks and PDS with their planets', () => {
    expect(structuresOf(board, 'p1')).toEqual([{ planet: jord, structures: { spacedock: 1 } }]);
    const winnu = pack.tiles[pack.factions.winnu.homeTile].planetIds[0];
    expect(structuresOf(board, 'p2')).toEqual([{ planet: winnu, structures: { pds: 1, spacedock: 1 } }]);
  });
});

describe('what a player holds', () => {
  test('cardsOf by kind, purged cards left out', () => {
    expect(cardsOf(board, 'p1', 'technology').map(c => c.id).sort()).toEqual(['technology:amd', 'technology:nm']);
    expect(cardsOf(board, 'p1', 'leader')).toHaveLength(3);
    expect(cardsOf(board, 'p1').length).toBeGreaterThan(cardsOf(board, 'p1', 'leader').length);
    const [agent] = cardsOf(board, 'p1', 'leader').filter(c => c.state === 'ready');
    const purged = { ...board, players: { ...board.players, p1: { ...board.players.p1, cards: { ...board.players.p1.cards, [agent.id]: { state: 'purged' as const, count: 1 } } } } };
    expect(cardsOf(purged, 'p1', 'leader')).toHaveLength(2);
  });

  test('poolsOf', () => {
    expect(poolsOf(board, 'p1')).toEqual({ tactic: 3, fleet: 3, strategy: 2 });
  });
});
