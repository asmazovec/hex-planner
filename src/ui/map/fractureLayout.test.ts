import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { seatSlots } from '../../domain/mapBuilder';
import { fractureLayout } from './HexMap';
import { HEX_SIZE, hexToPixel, mapBounds } from './geometry';
import { NUMBER_FONT } from './TileView';
import { capFit, clampView } from './viewLimits';

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

const spread = (spots: { x: number; y: number }[], axis: 'x' | 'y') =>
  Math.max(...spots.map(s => s[axis])) - Math.min(...spots.map(s => s[axis]));

test.each([[0, -3], [0, 3]])('at a top or bottom seat %i,%i the group lies in rows', (q, r) => {
  const { spots } = fractureLayout(ids, base, hexToPixel(q, r));
  expect(spread(spots, 'x')).toBeGreaterThan(spread(spots, 'y'));
});

test.each([[3, -3], [3, 0], [-3, 0], [-3, 3]])('at a side seat %i,%i the group lies in columns', (q, r) => {
  const { spots } = fractureLayout(ids, base, hexToPixel(q, r));
  expect(spread(spots, 'y')).toBeGreaterThan(spread(spots, 'x'));
});

test.each([[0, -3], [3, -3]])('the tiles of the group never overlap, seat %i,%i', (q, r) => {
  const { spots } = fractureLayout(ids, base, hexToPixel(q, r));
  for (const a of spots) for (const b of spots) {
    if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(HEX_SIZE * 1.7);
  }
});

const SVG = { width: 760, height: 652 };
const fit = (r: { width: number; height: number }) => Math.min(SVG.width / r.width, SVG.height / r.height);

describe.each([3, 4, 5, 6, 7, 8])('Fracture with %i players on the 1180x820 map area', playerCount => {
  const pack = loadPack(['pok', 'te']);
  const slots = pack.templates.find(tpl => tpl.playerCount === playerCount)!.slots;
  const mapRect = mapBounds(slots);
  const seats = seatSlots(playerCount, pack);
  const tiles = Object.values(pack.tiles).filter(tile => tile.kind === 'fracture').map(tile => tile.id);

  test.each(seats.map((key, i) => [i + 1, key] as const))('seat %i: numbers stay readable and the group can be reached', (_seat, key) => {
    const [q, r] = key.split(',').map(Number);
    const layout = fractureLayout(tiles, mapRect, hexToPixel(q, r));
    const window = capFit(mapRect, layout.bounds);
    const k = fit(window);
    expect(k).toBeGreaterThanOrEqual(fit(mapRect) * 0.8 - 1e-9);

    // Pan so that the group is in the middle, in screen pixels relative to the viewport centre.
    const midX = window.x + window.width / 2;
    const midY = window.y + window.height / 2;
    const groupX = (Math.min(...layout.spots.map(s => s.x)) + Math.max(...layout.spots.map(s => s.x))) / 2;
    const groupY = (Math.min(...layout.spots.map(s => s.y)) + Math.max(...layout.spots.map(s => s.y))) / 2;
    const view = clampView(
      { x: (midX - groupX), y: (midY - groupY), scale: 1 },
      { width: SVG.width / k, height: SVG.height / k },
      {
        width: mapRect.width, height: mapRect.height,
        centerX: mapRect.x + mapRect.width / 2 - midX, centerY: mapRect.y + mapRect.height / 2 - midY,
      },
    );
    for (const s of layout.spots) {
      expect(Math.abs(s.x - midX + view.x) + HEX_SIZE).toBeLessThanOrEqual(SVG.width / k / 2 + 1);
      expect(Math.abs(s.y - midY + view.y) + HEX_SIZE * 0.87).toBeLessThanOrEqual(SVG.height / k / 2 + 1);
    }
  });
});

/**
 * The number is half size at the user's request, so these are measured floors, not targets: pixels at the fit that opens
 * the map on the 1180x820 area. Lowering them means the number has shrunk again.
 */
test('the tile number keeps its measured size on every map, with and without the Fracture', () => {
  const SMALLEST_PLAIN_PX = 5.16;
  const SMALLEST_FRACTURE_PX = 4.19;
  const pack = loadPack(['pok', 'te']);
  const tiles = Object.values(pack.tiles).filter(tile => tile.kind === 'fracture').map(tile => tile.id);
  const templates = pack.templates.filter(template => template.playerCount >= 3 && template.playerCount <= 8);
  expect(new Set(templates.map(template => template.playerCount)).size).toBe(6);

  const plain = templates.map(template => fit(mapBounds(template.slots)) * NUMBER_FONT);
  const withFracture = templates.flatMap(template => {
    const mapRect = mapBounds(template.slots);
    const anchors = [null, ...(template.homes ?? []).map(key => {
      const [q, r] = key.split(',').map(Number);
      return hexToPixel(q, r);
    })];
    return anchors.map(anchor => fit(capFit(mapRect, fractureLayout(tiles, mapRect, anchor).bounds)) * NUMBER_FONT);
  });
  expect(Math.min(...plain)).toBeGreaterThanOrEqual(SMALLEST_PLAIN_PX);
  expect(Math.min(...withFracture)).toBeGreaterThanOrEqual(SMALLEST_FRACTURE_PX);
});

test('without a seat the group is to the right of the map', () => {
  const { spots } = fractureLayout(ids, base, null);
  expect(Math.min(...spots.map(s => s.x))).toBeGreaterThan(base.x + base.width);
});
