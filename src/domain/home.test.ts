import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { parseMapString } from './mapString';
import { createGame } from './newGame';
import { project } from './project';
import { homeNotes, homeOf, homeSlot } from './strategy';
import type { Game } from './types';

const pack = loadPack(['pok', 'te']);
const MAP_STRING = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

/** A pasted map: seat 1 holds tile 58, the home of the Argent Flight. */
function pasted(faction: string): Game {
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction }, pack);
  game.map = parseMapString(MAP_STRING, 6, pack).map;
  return game;
}
const startUnits = (game: Game) => project(game, game.plans[0], 'forecast', pack).state.systems;

describe('where my start units stand', () => {
  test('a faction whose home tile is not on the map starts at the home slot of its seat', () => {
    const game = pasted('sol');
    expect(game.map['0,-3']).toBe('58');
    expect(homeSlot(game, pack)).toBe('0,-3');
    expect(startUnits(game)['0,-3']).toEqual(pack.factions.sol.startUnits);
  });

  test('a faction whose tile is on the map keeps the slot of its tile, whatever the seat', () => {
    const game = pasted('muaat');
    expect(game.map['-3,0']).toBe('4');
    expect(homeSlot(game, pack)).not.toBe('0,-3');
    expect(game.map[homeSlot(game, pack)!]).toBe('4');
    expect(startUnits(game)[homeSlot(game, pack)!]).toEqual(pack.factions.muaat.startUnits);
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
