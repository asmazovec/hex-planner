import { HEX_INNER } from '../../domain/hexLayout';
import { expect, test } from 'vitest';
import { HEX_SIZE, hexCorners, hexToPixel, mapBounds } from './geometry';

const NEIGHBORS: [number, number][] = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]];
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

test('the origin hex sits at the origin', () => {
  expect(hexToPixel(0, 0)).toEqual({ x: 0, y: 0 });
});

test('north is up and north-east is up and right', () => {
  expect(hexToPixel(0, -1).y).toBeLessThan(0);
  expect(hexToPixel(0, -1).x).toBe(0);
  const ne = hexToPixel(1, -1);
  expect(ne.x).toBeGreaterThan(0);
  expect(ne.y).toBeLessThan(0);
});

test('neighbors touch edge to edge without overlapping', () => {
  const apothem = (HEX_SIZE * Math.sqrt(3)) / 2;
  for (const [dq, dr] of NEIGHBORS) {
    expect(dist(hexToPixel(0, 0), hexToPixel(dq, dr))).toBeCloseTo(2 * apothem, 6);
  }
  // every hex three steps away is further than two apothems
  for (const [q, r] of [[2, -1], [3, 0], [0, 2], [-2, 2]]) {
    expect(dist(hexToPixel(0, 0), hexToPixel(q, r))).toBeGreaterThan(2 * apothem);
  }
});

test('corners form a flat-top hexagon of the given size', () => {
  const corners = hexCorners(10);
  expect(corners).toHaveLength(6);
  expect(corners[0]).toEqual({ x: 10, y: 0 });
  expect(corners[1].x).toBeCloseTo(5);
  expect(corners[1].y).toBeCloseTo(8.660254, 5);
});

test('bounds contain every hex fully', () => {
  const b = mapBounds([{ q: 0, r: 0 }, { q: 3, r: -3 }, { q: -3, r: 3 }]);
  const apothem = (HEX_SIZE * Math.sqrt(3)) / 2;
  for (const [q, r] of [[0, 0], [3, -3], [-3, 3]]) {
    const { x, y } = hexToPixel(q, r);
    expect(x - HEX_SIZE).toBeGreaterThanOrEqual(b.x);
    expect(x + HEX_SIZE).toBeLessThanOrEqual(b.x + b.width);
    expect(y - apothem).toBeGreaterThanOrEqual(b.y);
    expect(y + apothem).toBeLessThanOrEqual(b.y + b.height);
  }
});

test('the hex radius the layout works with is the drawn one', () => {
  expect(HEX_INNER).toBe(HEX_SIZE - 1.5);
});
