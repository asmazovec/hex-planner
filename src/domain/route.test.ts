import { expect, test } from 'vitest';
import { areAdjacent, extendPath, routeFromPath, tacticalNumbers, tapStep } from './route';
import type { Entry } from './types';

test('plain grid neighbours are adjacent, wormholes and hyperlanes mean nothing', () => {
  expect(areAdjacent('0,0', '1,0')).toBe(true);
  expect(areAdjacent('0,0', '1,-1')).toBe(true);
  expect(areAdjacent('0,0', '-1,1')).toBe(true);
  expect(areAdjacent('0,0', '1,1')).toBe(false);
  expect(areAdjacent('0,0', '2,0')).toBe(false);
  expect(areAdjacent('0,0', '0,0')).toBe(false);
  expect(areAdjacent('0,0', '51')).toBe(false);
});

test('building a route: append, back-step, a non-adjacent jump, no repeats', () => {
  expect(extendPath(['0,0'], '1,0')).toEqual(['0,0', '1,0']);
  expect(extendPath(['0,0', '1,0'], '1,0')).toEqual(['0,0', '1,0']);
  expect(extendPath(['0,0', '1,0'], '0,0')).toEqual(['0,0']);
  expect(extendPath(['0,0', '1,0'], '3,0')).toEqual(['0,0', '1,0', '3,0']);
  expect(extendPath(['0,0', '1,0', '2,0'], '0,0')).toEqual(['0,0', '1,0', '2,0']);
});

test('a finished drag gives the source and the systems on the way, in flight order, in either direction', () => {
  expect(routeFromPath(['a', 'b', 'c', 'X'], 'X')).toEqual({ from: 'a', via: ['b', 'c'] });
  expect(routeFromPath(['a', 'X'], 'X')).toEqual({ from: 'a', via: [] });
  expect(routeFromPath(['X', 'c', 'b', 'a'], 'X')).toEqual({ from: 'a', via: ['b', 'c'] });
  expect(routeFromPath(['X', 'a'], 'X')).toEqual({ from: 'a', via: [] });
});

test('a drag that does not join a system and the active one gives no route', () => {
  expect(routeFromPath(['a'], 'X')).toBeNull();
  expect(routeFromPath(['X'], 'X')).toBeNull();
  expect(routeFromPath(['a', 'b'], 'X')).toBeNull();
  expect(routeFromPath(['a', 'X', 'b'], 'X')).toBeNull();
});

test('taps: the source, hexes in order, the active system finishes; a tap on the last hex removes it', () => {
  expect(tapStep(null, 'a', 'X')).toEqual({ path: ['a'] });
  expect(tapStep(['a'], 'b', 'X')).toEqual({ path: ['a', 'b'] });
  expect(tapStep(['a', 'b'], 'b', 'X')).toEqual({ path: ['a'] });
  expect(tapStep(['a'], 'a', 'X')).toEqual({ path: null });
  expect(tapStep(['a', 'b', 'c'], 'a', 'X')).toEqual({ path: ['a', 'b', 'c'] });
  expect(tapStep(['a', 'b', 'c'], 'X', 'X')).toEqual({ path: null, route: { from: 'a', via: ['b', 'c'] } });
});

test('a tap on the active system with no route under way says so', () => {
  expect(tapStep(null, 'X', 'X')).toEqual({ path: null, onActive: true });
});

const tacticalEntry = (id: string, status: Entry['status'] = 'planned'): Entry => ({
  id, status, phase: 'action', type: 'tactical', systemId: '0,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
});
const pass = (id: string): Entry => ({ id, status: 'planned', phase: 'action', type: 'pass' });

test('numbering counts tactical actions only, in entry order; a cancelled one keeps no number', () => {
  const list = [tacticalEntry('a'), pass('p'), tacticalEntry('b', 'cancelled'), tacticalEntry('c', 'done'), tacticalEntry('d')];
  expect(tacticalNumbers(list)).toEqual({ a: 1, c: 2, d: 3 });
  expect(tacticalNumbers([list[4], list[1], list[3], list[0]])).toEqual({ d: 1, c: 2, a: 3 });
  expect(tacticalNumbers([])).toEqual({});
});

test('each player counts their own turns: the first action of everyone is 1, wherever it stands in the plan', () => {
  const action = (id: string, owner?: string, status = 'planned') => ({ id, type: 'tactical', status, owner }) as Entry;
  const list = [action('a'), action('b', 'hacan'), action('c', 'muaat'), action('d', 'hacan'), action('e'), action('f', 'hacan', 'cancelled'), action('g', 'hacan')];
  expect(tacticalNumbers(list)).toEqual({ a: 1, b: 1, c: 1, d: 2, e: 2, g: 3 });
  expect(tacticalNumbers([list[3], list[0], list[1]])).toEqual({ d: 1, a: 1, b: 2 });
});
