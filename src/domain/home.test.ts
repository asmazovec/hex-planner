import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { parseMapString } from './mapString';
import { createGame } from '../testing/old/domain/newGame';
import { project } from '../testing/old/domain/project';
import { homeOf, homeSlot, startingDocks } from './strategy';
import { homeNotes } from '../testing/old/domain/strategy';
import type { Game } from '../testing/old/domain/types';

const pack = loadPack(['pok', 'te']);
const MAP_STRING = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

/** A pasted map: seat 1 holds tile 58, the home of the Argent Flight. */
function pasted(faction: string): Game {
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction }, pack);
  game.map = parseMapString(MAP_STRING, 6, pack).map;
  return game;
}
/** The start units that stand in space: the ground forces stand on the home planet (LRR 43.1). */
const shipsOf = (units: Record<string, number | undefined>) => Object.fromEntries(Object.entries(units).filter(([id]) => id !== 'infantry'));
const startUnits = (game: Game) => project(game, game.plans[0], 'forecast', pack).state.systems;

describe('where my start units stand', () => {
  test('a faction whose home tile is not on the map starts at the home slot of its seat', () => {
    const game = pasted('sol');
    expect(game.map['0,-3']).toBe('58');
    expect(homeSlot(game, pack)).toBe('0,-3');
    expect(startUnits(game)['0,-3']).toEqual({ carrier: 2, destroyer: 1, fighter: 3 });
  });

  test('a faction whose tile is on the map keeps the slot of its tile, whatever the seat', () => {
    const game = pasted('muaat');
    expect(game.map['-3,0']).toBe('4');
    expect(homeSlot(game, pack)).not.toBe('0,-3');
    expect(game.map[homeSlot(game, pack)!]).toBe('4');
    expect(startUnits(game)[homeSlot(game, pack)!]).toEqual(shipsOf(pack.factions.muaat.startUnits));
  });

  test('Creuss keeps its home tile id while only the gate stands on the map', () => {
    const ghost = pack.factions.ghost;
    const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'ghost' }, pack);
    game.map = { '2,2': ghost.gateTile! };
    expect(homeSlot(game, pack)).toBe(ghost.homeTile);
  });

  test('an empty seat falls back to the first slot with a tile and says so', () => {
    const game = pasted('sol');
    delete game.map['0,-3'];
    const home = homeOf(game, pack);
    expect(home.fallback).toBe(true);
    expect(home.slot).not.toBeNull();
    expect(game.map[home.slot!]).toBeDefined();
    expect(homeNotes(game, pack)).toContainEqual({ kind: 'noHome', seat: 1 });
    expect(homeOf({ ...game, map: {} }, pack).slot).toBeNull();
  });
});

describe('notes about a seat holding another faction\'s home', () => {
  test('names the tile\'s faction and the chosen one, and stays quiet otherwise', () => {
    expect(homeNotes(pasted('sol'), pack)).toContainEqual({ kind: 'foreign', seat: 1, other: 'argent', mine: 'sol' });
    expect(homeNotes(pasted('argent'), pack)).toEqual([]);
  });
});

describe('home planets when my home tile is not on the map', () => {
  const stateOf = (game: Game) => project(game, game.plans[0], 'forecast', pack).state;
  const argent = () => pack.tiles['58'].planetIds;

  test('control and the starting dock follow the tile at my seat, and the absent planets count for nothing', () => {
    const state = stateOf(pasted('sol'));
    for (const planet of argent()) expect(state.control[planet]).toBe('me');
    expect(state.docks).toEqual([argent()[0]]);
    expect(state.control.jord).toBeUndefined();
  });

  test('a planet set to an opponent stays theirs', () => {
    const game = pasted('sol');
    game.planetControl[argent()[1]] = 'enemy';
    expect(stateOf(game).control[argent()[1]]).toBe('enemy');
  });

  test('a removed starting dock stays removed', () => {
    const game = pasted('sol');
    game.docks = [];
    expect(stateOf(game).docks).toEqual([]);
    expect(startingDocks(game, pack)).toEqual([]);
  });

  test('my own home on the map keeps its planets, and so does Creuss with only the gate', () => {
    const sol = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, pack);
    expect(stateOf(sol).control.jord).toBe('me');
    expect(stateOf(sol).docks).toEqual(['jord']);
    const creuss = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'ghost' }, pack);
    const home = pack.tiles[pack.factions.ghost.homeTile].planetIds;
    expect(stateOf(creuss).docks).toEqual([home[0]]);
    expect(stateOf(creuss).control[home[0]]).toBe('me');
  });

  test('a fallback tile gets no control: the seat is only waiting for a tile', () => {
    const game = pasted('sol');
    delete game.map['0,-3'];
    const { slot } = homeOf(game, pack);
    for (const planet of pack.tiles[game.map[slot!].split('@')[0]].planetIds) expect(stateOf(game).control[planet]).toBeUndefined();
  });
});
