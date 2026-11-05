import { act, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { expect, test } from 'vitest';
import { usePanZoom } from './usePanZoom';

const bounds = { x: 0, y: 0, width: 100, height: 100 };
const ev = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, clientX, clientY }) as PointerEvent;

test('one pointer never pans or zooms', () => {
  const { result } = renderHook(() => usePanZoom(bounds, { current: null }));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 80, 60)));
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('two pointers moving together pan, moving apart zoom, and reset returns to the start', () => {
  const { result } = renderHook(() => usePanZoom(bounds, { current: null }));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerDown(ev(2, 30, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 20, 10)));
  act(() => result.current.handlers.onPointerMove(ev(2, 40, 10)));
  expect(result.current.view.x).toBeGreaterThan(0);
  const before = result.current.view.scale;
  act(() => result.current.handlers.onPointerMove(ev(2, 100, 10)));
  expect(result.current.view.scale).toBeGreaterThan(before);
  act(() => result.current.reset());
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});

test('a lifted finger ends the gesture', () => {
  const { result } = renderHook(() => usePanZoom(bounds, { current: null }));
  act(() => result.current.handlers.onPointerDown(ev(1, 10, 10)));
  act(() => result.current.handlers.onPointerDown(ev(2, 30, 10)));
  act(() => result.current.handlers.onPointerUp(ev(2, 30, 10)));
  act(() => result.current.handlers.onPointerMove(ev(1, 90, 10)));
  expect(result.current.view).toEqual({ x: 0, y: 0, scale: 1 });
});
