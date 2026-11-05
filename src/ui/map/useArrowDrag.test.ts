import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useArrowDrag } from './useArrowDrag';

const onComplete = vi.fn();
const onCancel = vi.fn();
let tiles: HTMLElement[] = [];
let under: string | null = null;

function tile(slot: string): HTMLElement {
  const el = document.createElement('div');
  el.dataset.slot = slot;
  tiles.push(el);
  return el;
}

beforeEach(() => {
  onComplete.mockClear();
  onCancel.mockClear();
  tiles = [];
  under = null;
  document.elementFromPoint = () => (under ? tile(under) : null);
});
afterEach(cleanup);

function setup(activeSystem: string | null = 'X') {
  const { result } = renderHook(() => useArrowDrag({ activeSystem, onComplete, onCancel }));
  const start = (slot: string) => act(() => {
    result.current.onTilePointerDown(slot, { pointerId: 1, clientX: 10, clientY: 10, isPrimary: true } as ReactPointerEvent);
  });
  const fire = (name: 'pointercancel' | 'pointerup' | 'pointermove' | 'secondPointerDown', x = 50, y = 60) => act(() => {
    const type = name === 'secondPointerDown' ? 'pointerdown' : name;
    window.dispatchEvent(new PointerEvent(type, { pointerId: name === 'secondPointerDown' ? 2 : 1, clientX: x, clientY: y }));
  });
  return { start, fire, arrowPreview: () => result.current.preview };
}

test('pointercancel и второй палец отменяют стрелку', () => {
  const { start, fire, arrowPreview } = setup();
  start('A');
  expect(arrowPreview()).not.toBeNull();
  fire('pointercancel');
  expect(onComplete).not.toHaveBeenCalled();
  expect(arrowPreview()).toBeNull();
  start('A');
  fire('secondPointerDown');
  expect(onComplete).not.toHaveBeenCalled();
  expect(arrowPreview()).toBeNull();
  expect(onCancel).toHaveBeenCalledTimes(2);
  under = 'X';
  fire('pointerup');
  expect(onComplete).not.toHaveBeenCalled();
});

test('стрелка работает в обоих направлениях', () => {
  const { start, fire, arrowPreview } = setup();
  under = 'X';
  start('A');
  fire('pointerup');
  expect(onComplete).toHaveBeenLastCalledWith('A');
  under = 'A';
  start('X');
  expect(arrowPreview()).toMatchObject({ from: 'X', reverse: true });
  fire('pointerup');
  expect(onComplete).toHaveBeenCalledTimes(2);
  expect(onComplete).toHaveBeenLastCalledWith('A');
  expect(arrowPreview()).toBeNull();
});

test('the preview follows the pointer', () => {
  const { start, fire, arrowPreview } = setup();
  start('A');
  fire('pointermove', 70, 80);
  expect(arrowPreview()).toEqual({ from: 'A', clientX: 70, clientY: 80, reverse: false });
});

test('a release that does not join a tile and the active system cancels', () => {
  const { start, fire } = setup();
  under = 'B';
  start('A');
  fire('pointerup');
  under = 'X';
  start('X');
  fire('pointerup');
  under = null;
  start('X');
  fire('pointerup');
  expect(onComplete).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledTimes(3);
});

test('without an active system nothing starts', () => {
  const { start, arrowPreview } = setup(null);
  start('A');
  expect(arrowPreview()).toBeNull();
});
