import { expect, test } from 'vitest';
import { clearRect, edgePan } from './edgePan';

const rect = { x: 100, y: 50, width: 800, height: 600 };
const ZONE = 50;
const MAX = 700;

test('inside the area, away from its edges, nothing moves', () => {
  expect(edgePan({ x: 500, y: 350 }, rect, ZONE, MAX)).toEqual({ dx: 0, dy: 0 });
  expect(edgePan({ x: 150, y: 100 }, rect, ZONE, MAX)).toEqual({ dx: 0, dy: 0 });
  expect(edgePan({ x: 850, y: 600 }, rect, ZONE, MAX)).toEqual({ dx: 0, dy: 0 });
});

test('the speed grows from nothing at the border of the zone to the most at the very edge', () => {
  expect(edgePan({ x: 875, y: 350 }, rect, ZONE, MAX)).toEqual({ dx: MAX / 2, dy: 0 });
  expect(edgePan({ x: 900, y: 350 }, rect, ZONE, MAX)).toEqual({ dx: MAX, dy: 0 });
  expect(edgePan({ x: 100, y: 350 }, rect, ZONE, MAX)).toEqual({ dx: -MAX, dy: 0 });
  expect(edgePan({ x: 500, y: 50 }, rect, ZONE, MAX)).toEqual({ dx: 0, dy: -MAX });
  expect(edgePan({ x: 500, y: 640 }, rect, ZONE, MAX)).toEqual({ dx: 0, dy: MAX * 0.8 });
});

test('in a corner both axes move, each by its own depth', () => {
  expect(edgePan({ x: 900, y: 650 }, rect, ZONE, MAX)).toEqual({ dx: MAX, dy: MAX });
  expect(edgePan({ x: 125, y: 50 }, rect, ZONE, MAX)).toEqual({ dx: -MAX / 2, dy: -MAX });
});

test('past the area the speed is the most, and no more', () => {
  expect(edgePan({ x: 2000, y: 350 }, rect, ZONE, MAX)).toEqual({ dx: MAX, dy: 0 });
  expect(edgePan({ x: -300, y: -300 }, rect, ZONE, MAX)).toEqual({ dx: -MAX, dy: -MAX });
});

test('without a run-up the speed is the same anywhere in the zone', () => {
  expect(edgePan({ x: 851, y: 350 }, rect, ZONE, 300, false)).toEqual({ dx: 300, dy: 0 });
  expect(edgePan({ x: 2000, y: 51 }, rect, ZONE, 300, false)).toEqual({ dx: 300, dy: -300 });
  expect(edgePan({ x: 500, y: 350 }, rect, ZONE, 300, false)).toEqual({ dx: 0, dy: 0 });
});

test('an area with no size moves nothing', () => {
  expect(edgePan({ x: 5, y: 5 }, { x: 0, y: 0, width: 0, height: 0 }, ZONE, MAX)).toEqual({ dx: 0, dy: 0 });
});

test('a tab over the side of the area moves its edge inwards, at the height of the tab only', () => {
  const left = { x: 100, y: 60, width: 34, height: 200 };
  const right = { x: 866, y: 60, width: 34, height: 120 };
  expect(clearRect(rect, [left, right], 100)).toEqual({ x: 134, y: 50, width: 732, height: 600 });
  expect(clearRect(rect, [left, right], 220)).toEqual({ x: 134, y: 50, width: 766, height: 600 });
  expect(clearRect(rect, [left, right], 400)).toEqual(rect);
  // A tab carried away from the area by its open drawer hides nothing of it.
  expect(clearRect(rect, [{ x: 1200, y: 60, width: 34, height: 200 }], 100)).toEqual(rect);
});
