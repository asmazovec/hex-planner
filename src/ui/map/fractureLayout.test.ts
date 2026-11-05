import { expect, test } from 'vitest';
import { fractureLayout } from './HexMap';
import { HEX_SIZE, hexToPixel } from './geometry';

const base = { x: -300, y: -300, width: 600, height: 600 };
const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const centreOf = (spots: { x: number; y: number }[]) => ({
  x: spots.reduce((s, p) => s + p.x, 0) / spots.length,
  y: spots.reduce((s, p) => s + p.y, 0) / spots.length,
});

test.each([[0, -3], [3, -3], [0, 3], [-3, 3]])('the group stands outward from the seat at %i,%i', (q, r) => {
  const seat = hexToPixel(q, r);
  const { spots } = fractureLayout(ids, base, seat);
  const c = centreOf(spots);
  const len = Math.hypot(seat.x, seat.y);
  const dir = { x: seat.x / len, y: seat.y / len };
  const along = (c.x - seat.x) * dir.x + (c.y - seat.y) * dir.y;
  const across = Math.abs((c.x - seat.x) * dir.y - (c.y - seat.y) * dir.x);
  expect(along).toBeGreaterThan(HEX_SIZE);
  // The centroid of 4+3 tiles is a few pixels off the layout centre.
  expect(across).toBeLessThan(10);
  // No tile of the group overlaps the seat's hex.
  for (const s of spots) expect(Math.hypot(s.x - seat.x, s.y - seat.y)).toBeGreaterThan(HEX_SIZE);
});

test('without a seat the group is to the right of the map', () => {
  const { spots } = fractureLayout(ids, base, null);
  expect(Math.min(...spots.map(s => s.x))).toBeGreaterThan(base.x + base.width);
});
