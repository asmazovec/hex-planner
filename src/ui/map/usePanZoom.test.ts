import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { usePanZoom } from './usePanZoom';

const bounds = { x: 0, y: 0, width: 100, height: 100 };
const SVG = 'http://www.w3.org/2000/svg';
const empty = document.createElementNS(SVG, 'svg');
const tile = document.createElementNS(SVG, 'g');
tile.setAttribute('data-slot', '1,0');
const inner = document.createElementNS(SVG, 'polygon');
tile.append(inner);
empty.append(tile);

const ev = (pointerId: number, clientX: number, clientY: number, target: Element = empty) =>
  ({ pointerId, clientX, clientY, target, button: 0 }) as unknown as PointerEvent;

let frames: FrameRequestCallback[] = [];
let clock = 0;
/** Runs the pending animation frames, `count` times, 16 ms apart. */
const runFrames = (count = 1) => act(() => {
  for (let i = 0; i < count; i += 1) {
    clock += 16;
    const due = frames;
    frames = [];
    due.forEach(f => f(clock));
  }
});

beforeEach(() => {
  frames = [];
  clock = 0;
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
  vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setup = (onEmptyTap?: () => void) => renderHook(() => usePanZoom(bounds, { current: null }, onEmptyTap)).result;

test('one pointer on empty space moves the map, on a tile it does not', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 30, 25, inner)));
  act(() => result.current.handlers.onPointerUp(ev(1, 30, 25, inner)));
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });

  act(() => result.current.handlers.onPointerDown(ev(2, 10, 10)));
  act(() => result.current.handlers.onPointerMove(ev(2, 30, 25)));
  expect(result.current.view).toEqual({ x: 20, y: 15, scale: 1 });
});

test('a tap on empty space is reported, a pan is not', () => {
  const onEmptyTap = vi.fn();
  const result = setup(onEmptyTap);
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 12, 11)));
  act(() => result.current.handlers.onPointerUp(ev(1, 12, 11)));
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
  expect(onEmptyTap).toHaveBeenCalledTimes(1);
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 40, 10)));
  act(() => result.current.handlers.onPointerUp(ev(1, 40, 10)));
  expect(onEmptyTap).toHaveBeenCalledTimes(1);
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerUp(ev(1, 10, 10, inner)));
  expect(onEmptyTap).toHaveBeenCalledTimes(1);
});

test('two pointers pan and zoom anywhere, even starting on tiles', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerDown(ev(2, 30, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 15, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(2, 35, 10, inner)));
  expect(result.current.view.x).toBeGreaterThan(0);
  const before = result.current.view.scale;
  act(() => result.current.handlers.onPointerMove(ev(2, 100, 10, inner)));
  expect(result.current.view.scale).toBeGreaterThan(before);
});

test('a lifted finger ends the pinch: the other one does not pan', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerDown(ev(2, 30, 10)));
  act(() => result.current.handlers.onPointerUp(ev(2, 30, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 90, 10)));
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('dragging past the limit gives way softly, then the view returns over several frames', () => {
  const result = setup();
  // Viewport equals the map here, so the limit on x is 50 + 50 - 100 / 3.
  const limit = 100 - 100 / 3;
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 500, 0)));
  const stretched = result.current.view.x;
  expect(stretched).toBeGreaterThan(limit);
  expect(stretched).toBeLessThan(500);
  act(() => result.current.handlers.onPointerUp(ev(1, 500, 0)));
  expect(result.current.view.x).toBe(stretched);
  runFrames();
  const between = result.current.view.x;
  expect(between).toBeLessThan(stretched);
  expect(between).toBeGreaterThan(limit);
  runFrames(200);
  expect(result.current.view.x).toBeCloseTo(limit);
  expect(frames).toHaveLength(0);
});

test('reset travels to the start through in-between frames', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 40, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, 40, 0)));
  act(() => result.current.reset());
  expect(result.current.view.x).toBe(40);
  runFrames();
  expect(result.current.view.x).toBeGreaterThan(0);
  expect(result.current.view.x).toBeLessThan(40);
  runFrames(200);
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('with reduced motion the view jumps without frames', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 500, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, 500, 0)));
  expect(result.current.view.x).toBeCloseTo(100 - 100 / 3);
  act(() => result.current.reset());
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
  expect(frames).toHaveLength(0);
});
