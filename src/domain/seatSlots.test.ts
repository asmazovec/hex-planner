import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { seatSlots } from './mapBuilder';

const pack = loadPack(['pok']);

const angleOf = (key: string): number => {
  const [q, r] = key.split(',').map(Number);
  const x = 1.5 * q;
  const y = Math.sqrt(3) * (q / 2 + r);
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
};

test.each([3, 4, 5, 6, 7, 8])('%i seats: seat 1 is at the top and the rest go clockwise', count => {
  const seats = seatSlots(count, pack);
  expect(seats).toHaveLength(count);
  expect(new Set(seats).size).toBe(count);
  const angles = seats.map(angleOf);
  expect(Math.min(angles[0], 360 - angles[0])).toBeLessThan(360 / count / 2 + 1e-6);
  for (let i = 1; i < count; i++) {
    expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    // Each seat is within half a step of its ideal angle.
    expect(Math.abs(angles[i] - (i * 360) / count)).toBeLessThanOrEqual(360 / count / 2 + 1e-6);
  }
});

test('6 players: seat 1 is the top corner, seat 2 the next corner clockwise', () => {
  const seats = seatSlots(6, pack);
  expect(seats[0]).toBe('0,-3');
  expect(seats[1]).toBe('3,-3');
});

test('a player count without a template has no seats', () => {
  expect(seatSlots(2, pack)).toEqual([]);
});
