import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { seatSlots } from '../../domain/mapBuilder';
import { fractureSlots } from '../../domain/thundersEdge';
import { fractureFrame } from './HexMap';
import { HEX_SIZE, hexToPixel, mapBounds } from './geometry';
import { NUMBER_FONT } from './TileView';
import { capFit, clampView } from './viewLimits';

const SVG = { width: 760, height: 652 };
const fit = (r: { width: number; height: number }) => Math.min(SVG.width / r.width, SVG.height / r.height);
const pack = loadPack(['pok', 'te']);

test('the chevron touches the map: the apex tile is one step from the nearest map tile', () => {
  const template = pack.templates.find(t => t.playerCount === 6 && t.layout === 'standard')!;
  const { spots } = fractureFrame(template.slots, fractureSlots(1, 6, pack, 'standard'));
  const nearest = Math.min(...template.slots.map(s => {
    const p = hexToPixel(s.q, s.r);
    return Math.hypot(p.x - spots[3].x, p.y - spots[3].y);
  }));
  expect(nearest).toBeLessThan(HEX_SIZE * Math.sqrt(3) + 1e-6);
});

describe.each([3, 4, 5, 6, 7, 8])('Fracture with %i players on the 1180x820 map area', playerCount => {
  const template = pack.templates.find(tpl => tpl.playerCount === playerCount)!;
  const mapRect = mapBounds(template.slots);
  const seats = seatSlots(playerCount, pack);

  test.each([null, ...seats.map((_, i) => i + 1)])('seat %s: the map keeps its scale and the chevron can be reached', seat => {
    const layout = fractureFrame(template.slots, fractureSlots(seat, playerCount, pack, template.layout));
    const window = capFit(mapRect, layout.bounds);
    const k = fit(window);
    expect(k).toBeGreaterThanOrEqual(fit(mapRect) * 0.8 - 1e-9);

    // Pan so that the chevron is in the middle, in screen pixels relative to the viewport centre.
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
  const SMALLEST_FRACTURE_PX = 4.49;
  const templates = pack.templates.filter(template => template.playerCount >= 3 && template.playerCount <= 8);
  expect(new Set(templates.map(template => template.playerCount)).size).toBe(6);

  const plain = templates.map(template => fit(mapBounds(template.slots)) * NUMBER_FONT);
  const withFracture = templates.flatMap(template => {
    const mapRect = mapBounds(template.slots);
    const seats = [null, ...seatSlots(template.playerCount, pack, template.layout).map((_, i) => i + 1)];
    return seats.map(seat => {
      const frame = fractureFrame(template.slots, fractureSlots(seat, template.playerCount, pack, template.layout));
      return fit(capFit(mapRect, frame.bounds)) * NUMBER_FONT;
    });
  });
  expect(Math.min(...plain)).toBeGreaterThanOrEqual(SMALLEST_PLAIN_PX);
  expect(Math.min(...withFracture)).toBeGreaterThanOrEqual(SMALLEST_FRACTURE_PX);
});
