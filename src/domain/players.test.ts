import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { seatSlots } from './mapBuilder';
import { createGame } from './newGame';
import {
  addPlayer, countChangeEffect, draftWithExpansions, maxPlayers, playersOf, removePlayer, setPlayerFaction, setPlayerVp, swapSeats,
} from './players';
import type { Game } from './types';

const pack = loadPack(['pok', 'te']);
const start = (playerCount = 6, faction = 'sol'): Game => createGame({ expansions: ['pok', 'te'], playerCount, faction }, pack);
const seats = (game: Game) => playersOf(game).map(p => p.seat);
const colors = (game: Game) => playersOf(game).map(p => p.color);

describe('defaults', () => {
  test('seats and colours go in list order, my faction first', () => {
    const game = start(4);
    expect(seats(game)).toEqual([1, 2, 3, 4]);
    expect(colors(game)).toEqual([1, 2, 3, 4]);
    expect(game.vp).toBe(0);
  });

  test('my home tile stands in seat 1 from the start', () => {
    const game = start();
    expect(game.map[seatSlots(6, pack, game.layout)[0]]).toBe('1');
  });

  test('a game without a faction leaves the home slot empty', () => {
    const game = start(6, '');
    expect(game.map[seatSlots(6, pack, game.layout)[0]]).toBeUndefined();
  });
});

describe('factions and home tiles', () => {
  const slots = seatSlots(6, pack, 'standard');

  test('choosing an opponent faction fills the empty slot of the seat', () => {
    const game = setPlayerFaction(start(), 1, 'hacan', pack);
    expect(game.opponents[0].faction).toBe('hacan');
    expect(game.map[slots[1]]).toBe('16');
  });

  test('a tile the user placed is not replaced', () => {
    const game = setPlayerFaction({ ...start(), map: { ...start().map, [slots[1]]: '30' } }, 1, 'hacan', pack);
    expect(game.map[slots[1]]).toBe('30');
  });

  test('changing a faction replaces its own home tile', () => {
    const game = setPlayerFaction(setPlayerFaction(start(), 1, 'hacan', pack), 1, 'letnev', pack);
    expect(game.map[slots[1]]).toBe('10');
    expect(Object.values(game.map)).not.toContain('16');
  });

  test('clearing a faction takes its home tile away', () => {
    const game = setPlayerFaction(setPlayerFaction(start(), 1, 'hacan', pack), 1, '', pack);
    expect(game.map[slots[1]]).toBeUndefined();
  });

  test('a gate faction puts its gate on the map, not the off-map tile', () => {
    const game = setPlayerFaction(start(), 1, 'ghost', pack);
    expect(game.map[slots[1]]).toBe('17');
  });

  test('changing my faction moves control and the dock to the new home', () => {
    const game = setPlayerFaction(start(), 0, 'letnev', pack);
    expect(game.faction).toBe('letnev');
    expect(game.planetControl).toEqual({ arcprime: 'me', wrenterra: 'me' });
    expect(game.docks).toEqual(['arcprime']);
    expect(game.map[slots[0]]).toBe('10');
  });
});

describe('swapping seats', () => {
  const slots = seatSlots(6, pack, 'standard');
  const withHacan = setPlayerFaction(start(), 1, 'hacan', pack);

  test('swaps the two players and only them', () => {
    expect(seats(swapSeats(withHacan, 0, 3, pack))).toEqual([4, 2, 3, 1, 5, 6]);
  });

  test('auto-placed home tiles travel with their players', () => {
    const game = swapSeats(withHacan, 0, 1, pack);
    expect(game.map[slots[0]]).toBe('16');
    expect(game.map[slots[1]]).toBe('1');
  });

  test('a tile the user placed in the target seat stays and is not replaced', () => {
    const game = swapSeats({ ...withHacan, map: { ...withHacan.map, [slots[3]]: '30' } }, 1, 3, pack);
    expect(game.map[slots[3]]).toBe('30');
    expect(game.map[slots[1]]).toBeUndefined();
  });

  test('a seat with itself changes nothing', () => {
    expect(swapSeats(withHacan, 2, 2, pack)).toBe(withHacan);
  });
});

describe('adding and removing', () => {
  test('a new opponent takes the last seat and the first free colour', () => {
    const game = addPlayer(removePlayer(start(4), 1, pack), pack);
    expect(seats(game)).toEqual([1, 2, 3, 4]);
    expect(colors(game)).toEqual([1, 3, 4, 2]);
    expect(game.playerCount).toBe(4);
  });

  test('removing shifts later seats down and keeps colours', () => {
    const swapped = swapSeats(start(5), 1, 4, pack); // seats 1 5 3 4 2
    const game = removePlayer(swapped, 2, pack); // the player in seat 3 leaves
    expect(seats(game)).toEqual([1, 4, 3, 2]);
    expect(colors(game)).toEqual([1, 2, 4, 5]);
    expect(game.playerCount).toBe(4);
  });

  test('my faction cannot be removed, the count stays between 3 and the maximum', () => {
    const three = start(3);
    expect(removePlayer(start(4), 0, pack).playerCount).toBe(4);
    expect(removePlayer(three, 1, pack)).toBe(three);
    const eight = start(8);
    expect(addPlayer(eight, pack)).toBe(eight);
  });

  test('home tiles move to the new home slots of the new count', () => {
    const six = setPlayerFaction(start(6), 3, 'hacan', pack);
    const five = removePlayer(six, 1, pack);
    const slots = seatSlots(5, pack, five.layout);
    expect(five.map[slots[0]]).toBe('1');
    expect(five.map[slots[2]]).toBe('16');
    expect(Object.values(five.map).filter(t => t === '16')).toHaveLength(1);
  });

  test('the map follows the new template and keeps the matching slots of the user', () => {
    const game = { ...start(6), map: { ...start(6).map, '1,0': '30', '0,1': '31' } };
    const next = removePlayer(game, 1, pack);
    expect(next.layout).toBe('standard');
    expect(next.map['1,0']).toBe('30');
    expect(next.map['0,1']).toBe('31');
  });

  test('a fracture seat beyond the new count is dropped', () => {
    const game = { ...start(4), fracture: { active: true, ingress: [], seat: 4 } };
    expect(removePlayer(game, 1, pack).fracture.seat).toBeNull();
    expect(removePlayer({ ...game, fracture: { ...game.fracture, seat: 2 } }, 1, pack).fracture.seat).toBe(2);
  });

  test('without tiles of the user the count picks the rules layout again', () => {
    expect(removePlayer(start(6), 1, pack).layout).toBe('hyperlanes');
  });
});

describe('what a count change costs', () => {
  test('home tiles and fixed tiles are not user tiles', () => {
    expect(countChangeEffect(setPlayerFaction(start(6), 1, 'hacan', pack), 5, pack)).toEqual({ filled: 0, lost: 0 });
  });

  test('tiles of the user are counted, and those the new template drops', () => {
    const six = start(6);
    const filled = { ...six, map: { ...six.map, '1,0': '30' } };
    expect(countChangeEffect(filled, 7, pack)).toEqual({ filled: 1, lost: 0 });
    const eight = start(8);
    const rim = { ...eight, map: { ...eight.map, '2,2': '30', '1,0': '31' } };
    expect(countChangeEffect(rim, 7, pack)).toEqual({ filled: 2, lost: 0 });
    const three = { ...start(4), map: { ...start(4).map, '3,0': '30' } };
    expect(countChangeEffect(three, 3, pack).filled).toBe(1);
  });
});

describe('points', () => {
  test('points of each player, never below zero', () => {
    const game = setPlayerVp(setPlayerVp(start(), 0, 3), 2, 5);
    expect(game.vp).toBe(3);
    expect(game.opponents[1].vp).toBe(5);
    expect(setPlayerVp(game, 0, -1).vp).toBe(0);
  });
});

describe('a draft and its expansions', () => {
  test('a faction outside the new set is cleared, seats and colours stay', () => {
    const draft = swapSeats(setPlayerFaction(start(6, 'argent'), 1, 'sol', pack), 0, 1, pack);
    const base = loadPack([]);
    const next = draftWithExpansions(draft, [], base);
    expect(next.expansions).toEqual([]);
    expect(next.faction).toBe('');
    expect(next.opponents[0].faction).toBe('sol');
    expect(seats(next)).toEqual(seats(draft));
    expect(next.map[seatSlots(6, base, next.layout)[0]]).toBe('1');
    expect(next.id).toBe(draft.id);
  });

  test('players above what the set allows leave, seats close up', () => {
    const draft = swapSeats(start(8), 0, 7, pack);
    const next = draftWithExpansions(draft, [], loadPack([]));
    expect(next.playerCount).toBe(6);
    expect([...seats(next)].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('the maximum follows the templates of the set', () => {
    expect(maxPlayers(loadPack([]))).toBe(6);
    expect(maxPlayers(pack)).toBe(8);
  });
});
