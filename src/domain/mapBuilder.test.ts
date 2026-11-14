import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { changeLayout, defaultLayout, duplicateTiles, emptySlots, readyToPlay, mapIsEmpty, resolveTile, seatSlots, slotsFor, templateFor, tileSuggestions, tilesLostByLayout } from './mapBuilder';
import { createGame } from '../testing/old/domain/newGame';

const base = loadPack([]);
const pok = loadPack(['pok']);

test('suggestions contain only tiles of enabled expansions', () => {
  expect(tileSuggestions('83', base)).toEqual([]);
  expect(tileSuggestions('83', pok).map(t => t.id)).toEqual(['83A', '83B']);
  expect(tileSuggestions('', pok)).toEqual([]);
  expect(tileSuggestions('83b', pok).map(t => t.id)).toEqual(['83B']);
});

test('duplicateTiles finds a repeat and ignores rotation', () => {
  expect(duplicateTiles({ '0,0': '18', '1,0': '25' })).toEqual([]);
  expect(duplicateTiles({ '0,0': '25', '1,0': '25', '2,0': '83A@1', '3,0': '83A@3' })).toEqual(['25', '83A']);
});

test('a six-player template has 37 slots', () => {
  expect(slotsFor(6, base)).toHaveLength(37);
  expect(slotsFor(9, base)).toEqual([]);
});

test('resolveTile accepts ids and unambiguous numbers only', () => {
  expect(resolveTile(' 25 ', base)?.id).toBe('25');
  expect(resolveTile('83a', pok)?.id).toBe('83A');
  expect(resolveTile('83', pok)).toBeNull();
  expect(resolveTile('999', pok)).toBeNull();
});

test('mapIsEmpty ignores the tiles the template places by itself', () => {
  const pack = loadPack(['pok']);
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  expect(mapIsEmpty(game, pack)).toBe(true);
  expect(mapIsEmpty({ ...game, map: { ...game.map, '1,0': '25' } }, pack)).toBe(false);
});

test('3, 4 and 5 players have both layouts with Prophecy of Kings; 6 and 8 have no hyperlanes, 7 no standard map', () => {
  for (const count of [3, 4, 5]) {
    expect(templateFor(count, 'standard', pok)?.layout).toBe('standard');
    expect(templateFor(count, 'hyperlanes', pok)?.layout).toBe('hyperlanes');
  }
  for (const count of [6, 8]) expect(templateFor(count, 'hyperlanes', pok)).toBeUndefined();
  expect(templateFor(7, 'standard', pok)).toBeUndefined();
  expect(templateFor(6, 'standard', pok)?.playerCount).toBe(6);
});

test('without Prophecy of Kings the hyperlane layouts are unavailable', () => {
  for (const count of [3, 4, 5]) {
    expect(templateFor(count, 'hyperlanes', base)).toBeUndefined();
    expect(templateFor(count, 'standard', base)).toBeDefined();
  }
});

test('3 players without hyperlanes keep 28 slots, and their hyperlane layout has 37', () => {
  expect(templateFor(3, 'standard', pok)!.slots).toHaveLength(28);
  expect(templateFor(3, 'hyperlanes', pok)!.slots).toHaveLength(37);
});

test('the default layout is the rules one: hyperlanes for five players with the tiles, standard otherwise', () => {
  expect(defaultLayout(5, pok)).toBe('hyperlanes');
  expect(defaultLayout(5, base)).toBe('standard');
  expect(defaultLayout(3, pok)).toBe('standard');
  expect(defaultLayout(6, pok)).toBe('standard');
});

test('seatSlots is the home list of the template of the layout', () => {
  expect(seatSlots(4, pok, 'hyperlanes')).toEqual(['0,-3', '3,-3', '0,3', '-3,3']);
  expect(seatSlots(4, pok, 'standard')).toEqual(['0,-3', '3,-3', '0,3', '-3,3']);
  expect(seatSlots(3, pok, 'hyperlanes')).toEqual(['0,-3', '3,0', '-3,3']);
  expect(seatSlots(5, pok, 'hyperlanes')).toEqual(['0,-3', '3,-3', '3,0', '-3,3', '-3,0']);
  expect(seatSlots(7, pok, 'alternate')).toEqual(['0,-4', '3,-3', '3,0', '0,4', '-3,4', '-4,2', '-3,-1']);
  // A layout the count lacks gives the default one's seats.
  expect(seatSlots(7, pok, 'standard')).toEqual(seatSlots(7, pok, 'hyperlanes'));
  expect(seatSlots(8, pok, 'standard')).toHaveLength(8);
});

test('every home of every template is one of its slots and holds no fixed tile', () => {
  for (const template of pok.templates) {
    const keys = new Set(template.slots.map(s => `${s.q},${s.r}`));
    expect(template.homes).toHaveLength(template.playerCount);
    for (const home of template.homes ?? []) expect(keys.has(home)).toBe(true);
    const homeSlots = template.slots.filter(slot => template.homes?.includes(`${slot.q},${slot.r}`));
    expect(homeSlots.every(slot => slot.fixed === undefined)).toBe(true);
  }
});

const gameOf = (count: number, layout?: 'standard' | 'hyperlanes') =>
  createGame({ expansions: ['pok'], playerCount: count, faction: 'sol', layout }, pok);

test('a new game takes the default layout and places the fixed tiles of that layout', () => {
  expect(gameOf(3).layout).toBe('standard');
  expect(gameOf(5).layout).toBe('hyperlanes');
  expect(gameOf(5).map['0,1']).toBe('86A@0');
  expect(gameOf(3, 'hyperlanes').map['2,-3']).toBe('83A@1');
});

test('changing the layout places the lanes, keeps tiles in slots both layouts have and drops the rest', () => {
  const game = gameOf(3);
  const filled = { ...game, map: { ...game.map, '1,0': '25', '0,2': '26' } };
  const next = changeLayout(filled, 'hyperlanes', pok);
  expect(next.layout).toBe('hyperlanes');
  expect(next.map['1,0']).toBe('25');
  expect(next.map['0,2']).toBe('26');
  expect(next.map['2,-3']).toBe('83A@1');
  expect(next.map['0,0']).toBe('18');
  expect(Object.values(next.map).filter(v => v.startsWith('8')).length).toBeGreaterThan(0);
});

test('the lanes of the old layout leave with it, and tiles in slots the new layout lacks are dropped', () => {
  const lanes = gameOf(3, 'hyperlanes');
  // 3,-3 is a lane slot with no counterpart in the 28-slot template: a tile of the player there is dropped.
  const back = changeLayout({ ...lanes, map: { ...lanes.map, '1,0': '25', '3,-3': '30' } }, 'standard', pok);
  expect(back.layout).toBe('standard');
  expect(back.map).toEqual({ '0,0': '18', '0,-3': lanes.map['0,-3'], '1,0': '25' });
});

test('a tile of the player on a lane slot is displaced by the lane', () => {
  const game = gameOf(3);
  const next = changeLayout({ ...game, map: { ...game.map, '1,-2': '30' } }, 'hyperlanes', pok);
  expect(next.map['1,-2']).toBe('87A@0');
  expect(next.map['2,-3']).toBe('83A@1');
});

test('tilesLostByLayout counts tiles in slots the layout lacks and tiles under its lanes, nothing else', () => {
  const game = gameOf(3);
  expect(tilesLostByLayout(game, 'hyperlanes', pok)).toBe(0);
  const filled = { ...game, map: { ...game.map, '1,0': '25', '1,-2': '30' } };
  expect(tilesLostByLayout(filled, 'hyperlanes', pok)).toBe(1);
  expect(tilesLostByLayout(filled, 'standard', pok)).toBe(0);
  const lanes = gameOf(3, 'hyperlanes');
  expect(tilesLostByLayout(lanes, 'standard', pok)).toBe(0);
  expect(tilesLostByLayout({ ...lanes, map: { ...lanes.map, '3,-3': '30', '1,0': '25' } }, 'standard', pok)).toBe(1);
});

test('mapIsEmpty is false once a lane is replaced by another tile', () => {
  const game = gameOf(3, 'hyperlanes');
  expect(mapIsEmpty({ ...game, map: { ...game.map, '2,-3': '25' } }, pok)).toBe(false);
  expect(mapIsEmpty({ ...game, map: { ...game.map, '2,-3': '83A@2' } }, pok)).toBe(false);
});

test('only the sides Milty repeats are exempt from the duplicate warning', () => {
  const map = { '1,0': '84B@0', '2,0': '84B@1', '3,0': '85A@0', '4,0': '85A@1' };
  expect(duplicateTiles(map, pok)).toEqual(['84B']);
});

test('changing to the same or an unavailable layout returns the same game', () => {
  const game = gameOf(3);
  expect(changeLayout(game, 'standard', pok)).toBe(game);
  expect(changeLayout(game, 'hyperlanes', base)).toBe(game);
  const six = gameOf(6);
  expect(changeLayout(six, 'hyperlanes', pok)).toBe(six);
});

test('mapIsEmpty counts the fixed tiles of the layout of the game as empty', () => {
  expect(mapIsEmpty(gameOf(3, 'hyperlanes'), pok)).toBe(true);
  expect(mapIsEmpty(gameOf(5), pok)).toBe(true);
});

test('repeated Milty hyperlane sides are not duplicates, repeated systems still are', () => {
  const map = { '1,0': '25', '2,0': '25', '3,0': '83A@1', '4,0': '83A@2' };
  expect(duplicateTiles(map, pok)).toEqual(['25']);
  expect(duplicateTiles(map)).toEqual(['25', '83A']);
});

test('a template without home slots gives each seat the outer slot nearest its ideal angle', () => {
  const template = { ...pok.templates.find(t => t.playerCount === 6)!, homes: undefined };
  const bare = { ...pok, templates: [template] };
  expect(seatSlots(6, bare)).toEqual(['0,-3', '3,-3', '3,0', '0,3', '-3,3', '-3,0']);
});

test('readyToPlay: every opponent seated with a faction and every free slot holding a tile (#8)', () => {
  const pack = loadPack(['pok']);
  const game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  expect(readyToPlay(game, pack)).toBe(false);
  const tiles = Object.keys(pack.tiles).filter(id => /^\d+$/.test(id) && Number(id) >= 19 && Number(id) <= 80);
  const built = { ...game, map: { ...game.map, ...Object.fromEntries(emptySlots(game, pack).map((key, i) => [key, tiles[i]])) } };
  expect(readyToPlay(built, pack)).toBe(false);
  const seated = { ...built, opponents: built.opponents.map((o, i) => ({ ...o, faction: ['hacan', 'jolnar'][i] })) };
  expect(readyToPlay(seated, pack)).toBe(true);
});
