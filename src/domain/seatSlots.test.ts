import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { seatSlots } from './mapBuilder';

const pack = loadPack(['pok']);

test('seat 1 is at the top, the rest follow clockwise, equally spaced on the outer ring', () => {
  const seats = seatSlots(6, pack);
  expect(seats).toHaveLength(6);
  expect(seats[0]).toBe('0,-3');
  expect(seats[1]).toBe('3,-3');
  expect(new Set(seats).size).toBe(6);
});

test('3 and 4 player maps give one slot per seat, other counts give nothing', () => {
  expect(seatSlots(3, pack)).toHaveLength(3);
  expect(seatSlots(4, pack)).toHaveLength(4);
  expect(seatSlots(5, pack)).toEqual([]);
  expect(seatSlots(8, pack)).toEqual([]);
});
