import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { slotsFor } from '../../domain/mapBuilder';
import { fractureSlots } from '../../domain/thundersEdge';
import { fractureFrame, hexCorners, hexToPixel, mapBounds, type Point, type Rect } from './geometry';
import { capFit, FIT_MARGIN, fitBox, type Size } from './viewLimits';

const pack = loadPack(['pok', 'te']);

/** The map area of the plan screen on the 1180x820 tablet: with the plan panel wide and narrow. */
const AREAS: Size[] = [{ width: 430, height: 770 }, { width: 880, height: 770 }];
/** The tabs of the drawers as the screen has them: 34 px wide columns at the top of each side. */
const tabsOf = ({ width }: Size): Rect[] => [{ x: 0, y: 14, width: 34, height: 158 }, { x: width - 34, y: 14, width: 34, height: 247 }];

/** Where a point of the map stands on screen, in pixels from the top left corner of the area, when `box` is its viewBox. */
const onScreen = (box: Rect, area: Size) => (p: Point): Point => ({
  x: (p.x - box.x) * (area.width / box.width),
  y: (p.y - box.y) * (area.height / box.height),
});

/** The outline of a hex as points on screen: its corners and points along each side. */
function outline(centre: Point, toScreen: (p: Point) => Point): Point[] {
  const corners = hexCorners().map(c => ({ x: centre.x + c.x, y: centre.y + c.y }));
  return corners.flatMap((a, i) => {
    const b = corners[(i + 1) % 6];
    return Array.from({ length: 12 }, (_, step) => toScreen({ x: a.x + ((b.x - a.x) * step) / 12, y: a.y + ((b.y - a.y) * step) / 12 }));
  });
}

const inside = (p: Point, r: Rect) => p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height;

describe.each(AREAS)('the map opens whole in an area of $width x $height', area => {
  describe.each([[6, 'standard'], [8, 'standard']] as const)('%i players, %s layout', (playerCount, layout) => {
    const slots = slotsFor(playerCount, pack, layout);
    const centres = slots.map(s => hexToPixel(s.q, s.r));
    const content = mapBounds(slots);

    test('every hex is inside, with the margin free on each side', () => {
      const box = fitBox(content, area, centres, tabsOf(area));
      // The box has the proportions of the area: nothing is added by the browser around it.
      expect(box.width / box.height).toBeCloseTo(area.width / area.height, 6);
      const points = centres.flatMap(c => outline(c, onScreen(box, area)));
      expect(Math.min(...points.map(p => p.x))).toBeGreaterThanOrEqual(FIT_MARGIN);
      expect(Math.min(...points.map(p => p.y))).toBeGreaterThanOrEqual(FIT_MARGIN);
      expect(Math.max(...points.map(p => p.x))).toBeLessThanOrEqual(area.width - FIT_MARGIN);
      expect(Math.max(...points.map(p => p.y))).toBeLessThanOrEqual(area.height - FIT_MARGIN);
    });

    test('no hex lies under a tab of the drawers', () => {
      const tabs = tabsOf(area);
      const box = fitBox(content, area, centres, tabs);
      const points = centres.flatMap(c => outline(c, onScreen(box, area)));
      for (const tab of tabs) expect(points.filter(p => inside(p, tab))).toEqual([]);
    });

    test('the map is as large as the margin allows when no tab is in the way', () => {
      const box = fitBox(content, area, centres, []);
      const scale = area.width / box.width;
      expect(scale).toBeCloseTo(Math.min((area.width - 2 * FIT_MARGIN) / content.width, (area.height - 2 * FIT_MARGIN) / content.height), 6);
      // Centred on the map.
      expect(box.x + box.width / 2).toBeCloseTo(content.x + content.width / 2, 6);
      expect(box.y + box.height / 2).toBeCloseTo(content.y + content.height / 2, 6);
    });

    test('with the Fracture open, every system of the window it opens on is inside too', () => {
      const frame = fractureFrame(slots, fractureSlots(1, playerCount, pack, layout));
      const window = capFit(content, frame.bounds);
      const all = [...centres, ...frame.spots];
      const box = fitBox(window, area, all, tabsOf(area));
      const toScreen = onScreen(box, area);
      const shown = all.filter(c => c.x - 60 >= window.x && c.x + 60 <= window.x + window.width && c.y - 52 >= window.y && c.y + 52 <= window.y + window.height);
      expect(shown.length).toBeGreaterThanOrEqual(centres.length);
      const points = shown.flatMap(c => outline(c, toScreen));
      expect(Math.min(...points.map(p => p.x))).toBeGreaterThanOrEqual(FIT_MARGIN);
      expect(Math.min(...points.map(p => p.y))).toBeGreaterThanOrEqual(FIT_MARGIN);
      expect(Math.max(...points.map(p => p.x))).toBeLessThanOrEqual(area.width - FIT_MARGIN);
      expect(Math.max(...points.map(p => p.y))).toBeLessThanOrEqual(area.height - FIT_MARGIN);
    });
  });
});

test('an area with no size yet leaves the box as it is', () => {
  const content = { x: -10, y: -20, width: 100, height: 50 };
  expect(fitBox(content, { width: 0, height: 0 }, [], [])).toEqual(content);
});
