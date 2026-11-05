import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { duplicateTiles, resolveTile, slotsFor, tileSuggestions } from './mapBuilder';

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
