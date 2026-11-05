import { describe, expect, test } from 'vitest';
import { capFit, clampView, popoverPosition, popoverSide, type Size, type View } from './viewLimits';

/** How much of the viewport the map covers on each axis; both are centred on the origin of the view. */
function overlap(view: View, viewport: Size, map: Size) {
  const axis = (at: number, screen: number, length: number) =>
    Math.min(at + (length * view.scale) / 2, screen / 2) - Math.max(at - (length * view.scale) / 2, -screen / 2);
  return { x: axis(view.x, viewport.width, map.width), y: axis(view.y, viewport.height, map.height) };
}

const screen = { width: 900, height: 600 };

describe('clampView', () => {
  test('the map stays on a third of the viewport on each axis', () => {
    const map = { width: 900, height: 900 };
    for (const [x, y] of [[99999, -99999], [-99999, 99999]]) {
      const c = overlap(clampView({ x, y, scale: 1 }, screen, map), screen, map);
      expect(c.x).toBeCloseTo(300);
      expect(c.y).toBeCloseTo(200);
    }
  });

  test('a view inside the limits comes back unchanged', () => {
    const view = { x: 40, y: -30, scale: 1 };
    expect(clampView(view, screen, { width: 900, height: 900 })).toBe(view);
  });

  test('a map smaller than a third of the viewport stays whole on screen', () => {
    const map = { width: 200, height: 100 };
    const c = overlap(clampView({ x: 99999, y: 99999, scale: 1 }, screen, map), screen, map);
    expect(c.x).toBeCloseTo(200);
    expect(c.y).toBeCloseTo(100);
  });

  test('the limits follow the scale', () => {
    const map = { width: 200, height: 200 };
    const zoomed = clampView({ x: -99999, y: 0, scale: 2 }, screen, map);
    expect(overlap(zoomed, screen, map).x).toBeCloseTo(300);
    expect(zoomed.x).toBeCloseTo(-(450 + 200 - 300));
    expect(zoomed.scale).toBe(2);
    const small = clampView({ x: 99999, y: 0, scale: 0.5 }, screen, map);
    expect(overlap(small, screen, map).x).toBeCloseTo(100);
  });
});

describe('clampView with a limit rectangle away from the view origin', () => {
  // The base map beside the Fracture group: its centre is 200 left of the middle of the whole drawing.
  const base = { width: 600, height: 600, centerX: -200, centerY: 0 };

  test('the rectangle itself keeps a third of the viewport covered', () => {
    const atLeft = clampView({ x: -99999, y: 0, scale: 1 }, screen, base);
    const right = atLeft.x + (base.centerX + base.width / 2);
    expect(right - -screen.width / 2).toBeCloseTo(300);
    const atRight = clampView({ x: 99999, y: 0, scale: 1 }, screen, base);
    const left = atRight.x + (base.centerX - base.width / 2);
    expect(screen.width / 2 - left).toBeCloseTo(300);
  });

  test('the offset follows the scale', () => {
    const atRight = clampView({ x: 99999, y: 0, scale: 2 }, screen, base);
    const left = atRight.x + (base.centerX - base.width / 2) * 2;
    expect(screen.width / 2 - left).toBeCloseTo(300);
  });

  test('a view inside stays the same object', () => {
    const view = { x: 150, y: 0, scale: 1 };
    expect(clampView(view, screen, base)).toBe(view);
  });
});

describe('capFit', () => {
  const base = { x: -300, y: -400, width: 600, height: 800 };

  test('a group that adds little is shown whole', () => {
    const full = { x: -300, y: -500, width: 600, height: 900 };
    expect(capFit(base, full)).toEqual(full);
  });

  test('the window grows at most a quarter on each axis, holds the map and leans to the group', () => {
    const above = capFit(base, { x: -300, y: -1000, width: 600, height: 1400 });
    expect(above.height).toBeCloseTo(1000);
    expect(above.y).toBeCloseTo(-600);
    const right = capFit(base, { x: -300, y: -400, width: 1200, height: 800 });
    expect(right.width).toBeCloseTo(750);
    expect(right.x).toBeCloseTo(-300);
  });
});

describe('popover placement', () => {
  const popup = { width: 300, height: 200 };
  const view = { width: 800, height: 600 };
  const hex = (left: number, top = 250) => ({ left, right: left + 100, top, bottom: top + 90 });

  test('opens to the right where it fits', () => {
    expect(popoverSide(hex(100), popup, view)).toBe('right');
  });

  test('opens to the left near the right edge', () => {
    expect(popoverSide(hex(600), popup, view)).toBe('left');
  });

  test('takes the roomier side when neither fits, and stays on screen', () => {
    const narrow = { width: 500, height: 600 };
    expect(popoverSide(hex(50), popup, narrow)).toBe('right');
    expect(popoverSide(hex(350), popup, narrow)).toBe('left');
    const place = popoverPosition(hex(350), popup, narrow);
    expect(place.left).toBeGreaterThanOrEqual(0);
    expect(place.left + popup.width).toBeLessThanOrEqual(narrow.width);
  });

  test('sits beside the hex, centred on it, and never leaves the screen', () => {
    const right = popoverPosition(hex(100), popup, view);
    expect(right.left).toBeGreaterThanOrEqual(200);
    expect(right.top + popup.height / 2).toBeCloseTo(295);
    const left = popoverPosition(hex(600), popup, view);
    expect(left.left + popup.width).toBeLessThanOrEqual(600);
    const high = popoverPosition(hex(100, -80), popup, view);
    expect(high.top).toBeGreaterThanOrEqual(0);
    const low = popoverPosition(hex(100, 590), popup, view);
    expect(low.top + popup.height).toBeLessThanOrEqual(view.height);
    const offRight = popoverPosition(hex(5000), popup, view);
    expect(offRight.left + popup.width).toBeLessThanOrEqual(view.width);
  });
});
