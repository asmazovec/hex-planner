import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { curveSegments, separateRoutes } from '../../domain/route';
import type { FlightRoute } from '../plan/tactical';
import { FlightLayer } from './FlightLayer';

let frames: FrameRequestCallback[] = [];
let now = 0;

const flush = (at: number) => act(() => {
  now = at;
  const due = frames;
  frames = [];
  due.forEach(f => f(at));
});

beforeEach(() => {
  frames = [];
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
  vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const slots = ['0,0', '1,0', '3,0'];
const route = (over: Partial<FlightRoute> = {}): FlightRoute => ({
  segments: curveSegments(separateRoutes([slots])[0], slots),
  durationMs: 1000,
  delayMs: 0,
  stacks: [
    { kind: 'carrier', x: 5, y: 0, size: 20, joins: [{ at: 0, count: 2, move: 0 }] },
    { kind: 'fighter', x: -5, y: 0, size: 16, joins: [{ at: 0.3, count: 1, move: 1 }] },
  ],
  ...over,
});

function setup(routes: FlightRoute[], passed: number[] = []) {
  const onPass = vi.fn();
  const onDone = vi.fn();
  const utils = render(<svg role="group" aria-label="map"><FlightLayer routes={routes} colour="#7fb2ff" passed={passed} onPass={onPass} onDone={onDone} /></svg>);
  return { ...utils, onPass, onDone };
}

const stack = (kind: string) => document.querySelector<SVGGElement>(`[data-flight-stack="${kind}"]`)!;
const position = (kind: string) => {
  const [, x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(stack(kind).getAttribute('transform') ?? '')!;
  return { x: Number(x), y: Number(y) };
};

test('one loop writes transforms along the route, keeping the formation rigid and the token size', () => {
  const { onDone } = setup([route()]);
  expect(frames).toHaveLength(1);
  flush(100);
  expect(frames).toHaveLength(1);
  const early = position('carrier');
  expect(stack('carrier').getAttribute('transform')).toContain('scale(0.2000)');
  flush(300);
  const later = position('carrier');
  expect(later.x).toBeGreaterThan(early.x);
  expect(position('fighter').x).toBeCloseTo(later.x - 10, 1);
  expect(onDone).not.toHaveBeenCalled();
  flush(1000);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(frames).toHaveLength(0);
});

test('a picked-up stack waits for the leader, then the map is told once', () => {
  const { onPass, rerender, onDone } = setup([route()]);
  expect(stack('fighter').querySelector('[data-unit]')).toBeNull();
  flush(50);
  expect(onPass).not.toHaveBeenCalled();
  flush(600);
  expect(onPass).toHaveBeenCalledTimes(1);
  expect(onPass).toHaveBeenCalledWith(1);
  rerender(<svg role="group" aria-label="map"><FlightLayer routes={[route()]} colour="#7fb2ff" passed={[1]} onPass={onPass} onDone={onDone} /></svg>);
  expect(stack('fighter').querySelector('[data-unit="fighter"]')).not.toBeNull();
  flush(700);
  expect(onPass).toHaveBeenCalledTimes(1);
});

test('later routes start 60 ms later; a stack is hidden until its route starts', () => {
  const second: FlightRoute = route({ delayMs: 60, stacks: [{ kind: 'cruiser', x: 0, y: 0, size: 20, joins: [{ at: 0, count: 1, move: 2 }] }] });
  setup([route(), second]);
  flush(30);
  expect(stack('carrier').style.visibility).toBe('visible');
  expect(stack('cruiser').style.visibility).toBe('hidden');
  flush(70);
  expect(stack('cruiser').style.visibility).toBe('visible');
});

test('on a broken step the ships are semi-transparent', () => {
  setup([route()]);
  flush(100);
  expect(stack('carrier').style.opacity).toBe('1');
  flush(950);
  expect(stack('carrier').style.opacity).toBe('0.4');
});

test('a press on the map finishes the flight at once, and its click reaches nothing', () => {
  const onClick = vi.fn();
  const onPass = vi.fn();
  const onDone = vi.fn();
  render(
    <svg role="group" aria-label="map" onClick={onClick}>
      <rect data-testid="tile" onClick={onClick} />
      <FlightLayer routes={[route()]} colour="#7fb2ff" passed={[]} onPass={onPass} onDone={onDone} />
    </svg>,
  );
  const tile = document.querySelector('rect')!;
  fireEvent.pointerDown(tile, { pointerId: 1 });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(frames).toHaveLength(0);
  fireEvent.pointerUp(window, { pointerId: 1 });
  fireEvent.click(tile);
  expect(onClick).not.toHaveBeenCalled();
});

test('nothing to fly ends at once', () => {
  const { onDone } = setup([]);
  flush(16);
  expect(onDone).toHaveBeenCalledTimes(1);
});
