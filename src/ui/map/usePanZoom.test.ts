import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reducedMotion, usePanZoom } from './usePanZoom';

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

test('one pointer moves the map from empty space and from a tile', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 30, 25, inner)));
  expect(result.current.view).toEqual({ x: 20, y: 15, scale: 1 });
  act(() => result.current.handlers.onPointerUp(ev(1, 30, 25, inner)));

  act(() => result.current.handlers.onPointerDown(ev(2, 10, 10)));
  act(() => result.current.handlers.onPointerMove(ev(2, 30, 25)));
  expect(result.current.view).toEqual({ x: 40, y: 30, scale: 1 });
});

test('a tile that starts an arrow does not move the map', () => {
  const starts = vi.fn((slot: string) => slot === '1,0');
  const { result } = renderHook(() => usePanZoom(bounds, { current: null }, undefined, bounds, starts));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 30, 25, inner)));
  act(() => result.current.handlers.onPointerUp(ev(1, 30, 25, inner)));
  expect(starts).toHaveBeenCalledWith('1,0');
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('a tap on a tile stays a tap: it is not reported as empty, keeps its click and takes no capture', () => {
  const onEmptyTap = vi.fn();
  const setPointerCapture = vi.fn();
  const svg = { setPointerCapture, addEventListener: vi.fn(), removeEventListener: vi.fn(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) } as unknown as SVGSVGElement;
  const { result } = renderHook(() => usePanZoom(bounds, { current: svg }, onEmptyTap));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 12, 11, inner)));
  act(() => result.current.handlers.onPointerUp(ev(1, 12, 11, inner)));
  expect(onEmptyTap).not.toHaveBeenCalled();
  expect(setPointerCapture).not.toHaveBeenCalled();
  const click = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
  act(() => result.current.handlers.onClickCapture(click as never));
  expect(click.stopPropagation).not.toHaveBeenCalled();
});

test('a pan that starts on a tile captures the pointer and swallows the click that ends it, once', () => {
  const setPointerCapture = vi.fn();
  const svg = { setPointerCapture, addEventListener: vi.fn(), removeEventListener: vi.fn(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) } as unknown as SVGSVGElement;
  const { result } = renderHook(() => usePanZoom(bounds, { current: svg }));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerMove(ev(1, 30, 25, inner)));
  expect(setPointerCapture).toHaveBeenCalledWith(1);
  act(() => result.current.handlers.onPointerUp(ev(1, 30, 25, inner)));
  const click = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
  act(() => result.current.handlers.onClickCapture(click as never));
  expect(click.stopPropagation).toHaveBeenCalledTimes(1);
  act(() => result.current.handlers.onClickCapture(click as never));
  expect(click.stopPropagation).toHaveBeenCalledTimes(1);

  act(() => result.current.handlers.onPointerDown(ev(2, 10, 10, inner)));
  act(() => result.current.handlers.onPointerUp(ev(2, 10, 10, inner)));
  act(() => result.current.handlers.onClickCapture(click as never));
  expect(click.stopPropagation).toHaveBeenCalledTimes(1);
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

const stretchAndRelease = (result: ReturnType<typeof setup>) => {
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 500, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, 500, 0)));
  runFrames();
};
const LIMIT = 100 - 100 / 3;

test('a tap on empty space during the return does not freeze the view past the limit', () => {
  const result = setup();
  stretchAndRelease(result);
  act(() => result.current.handlers.onPointerDown(ev(2, 10, 10)));
  act(() => result.current.handlers.onPointerUp(ev(2, 10, 10)));
  runFrames(200);
  expect(result.current.view.x).toBeCloseTo(LIMIT);
});

test('a press on a tile during the return does not freeze it either, even if held', () => {
  const result = setup();
  stretchAndRelease(result);
  act(() => result.current.handlers.onPointerDown(ev(2, 10, 10, inner)));
  runFrames(200);
  expect(result.current.view.x).toBeCloseTo(LIMIT);
  act(() => result.current.handlers.onPointerUp(ev(2, 10, 10, inner)));
});

test('presses without movement do not stop or change a reset', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 40, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, 40, 0)));
  act(() => result.current.reset());
  runFrames();
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerUp(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10, inner)));
  act(() => result.current.handlers.onPointerDown(ev(2, 30, 10, inner)));
  act(() => result.current.handlers.onPointerUp(ev(2, 30, 10, inner)));
  act(() => result.current.handlers.onPointerUp(ev(1, 10, 10, inner)));
  runFrames(200);
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('a finger takes over from a running return, and a reset during a pan does not fight it', () => {
  const result = setup();
  stretchAndRelease(result);
  const before = result.current.view.x;
  act(() => result.current.handlers.onPointerDown(ev(2, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(2, -10, 0)));
  expect(frames).toHaveLength(0);
  expect(result.current.view.x).toBeLessThan(before);
  act(() => result.current.reset());
  act(() => result.current.handlers.onPointerMove(ev(2, -20, 0)));
  expect(frames).toHaveLength(0);
  act(() => result.current.handlers.onPointerUp(ev(2, -20, 0)));
  runFrames(200);
  expect(result.current.view.x).toBeLessThanOrEqual(LIMIT + 1e-6);
});

test('the limit is measured on the given rectangle, not on the whole drawing', () => {
  // The drawing is 100 wide; the map is its left half.
  const result = renderHook(() => usePanZoom(bounds, { current: null }, undefined, { x: 0, y: 0, width: 50, height: 100 })).result;
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, -900, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, -900, 0)));
  runFrames(200);
  // The right edge of the map is the middle of the drawing; it ends a third of the viewport from the left side.
  expect(result.current.view.x).toBeCloseTo(-50 + 100 / 3);
});

test('a Fracture tile is a tile like any other: a tap on it is no tap on empty space', () => {
  const fracture = document.createElementNS(SVG, 'g');
  fracture.setAttribute('data-slot', 'f1');
  fracture.setAttribute('data-fracture-tile', 'f1');
  const hex = document.createElementNS(SVG, 'polygon');
  fracture.append(hex);
  const onEmptyTap = vi.fn();
  const result = setup(onEmptyTap);
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0, hex)));
  act(() => result.current.handlers.onPointerUp(ev(1, 0, 0, hex)));
  expect(onEmptyTap).not.toHaveBeenCalled();
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

test('energy saving counts as reduced motion', () => {
  expect(reducedMotion()).toBe(false);
  document.documentElement.dataset.energy = 'on';
  expect(reducedMotion()).toBe(true);
  document.documentElement.dataset.energy = 'off';
  expect(reducedMotion()).toBe(false);
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

test('when the focus ends the camera goes to the whole map, wherever it stood before', () => {
  const result = setup();
  act(() => result.current.handlers.onPointerDown(ev(1, 0, 0)));
  act(() => result.current.handlers.onPointerMove(ev(1, 40, 0)));
  act(() => result.current.handlers.onPointerUp(ev(1, 40, 0)));
  runFrames(200);
  expect(result.current.view.x).not.toBe(0);
  act(() => result.current.focus({ x: 10, y: 10, width: 30, height: 30 }));
  runFrames(300);
  expect(result.current.view.scale).toBeGreaterThan(1);
  act(() => result.current.focus(null));
  runFrames(400);
  expect(result.current.view.x).toBeCloseTo(0);
  expect(result.current.view.y).toBeCloseTo(0);
  expect(result.current.view.scale).toBeCloseTo(1);
});
