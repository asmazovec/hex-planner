import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
  const start = (slot: string, over: Partial<ReactPointerEvent> = {}) => act(() => {
    result.current.onTilePointerDown(slot, { pointerId: 1, clientX: 10, clientY: 10, isPrimary: true, button: 0, ...over } as ReactPointerEvent);
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
  expect(onComplete).toHaveBeenLastCalledWith({ from: 'A', via: [] });
  under = 'A';
  start('X');
  expect(arrowPreview()).toMatchObject({ path: ['X'], reverse: true });
  fire('pointerup');
  expect(onComplete).toHaveBeenCalledTimes(2);
  expect(onComplete).toHaveBeenLastCalledWith({ from: 'A', via: [] });
  expect(arrowPreview()).toBeNull();
});

test('each hex the pointer enters joins the route, and only that changes the preview', () => {
  const { start, fire, arrowPreview } = setup();
  start('A');
  const first = arrowPreview();
  under = 'A';
  fire('pointermove', 70, 80);
  expect(arrowPreview()).toEqual(first);
  under = 'B';
  fire('pointermove', 70, 80);
  expect(arrowPreview()).toEqual({ path: ['A', 'B'], clientX: 70, clientY: 80, reverse: false });
  under = 'C';
  fire('pointermove', 90, 80);
  under = 'X';
  fire('pointerup', 90, 90);
  expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: ['B', 'C'] });
});

test('going back onto the previous hex removes the last step', () => {
  const { start, fire, arrowPreview } = setup();
  start('A');
  under = 'B';
  fire('pointermove');
  under = 'C';
  fire('pointermove');
  under = 'B';
  fire('pointermove');
  expect(arrowPreview()?.path).toEqual(['A', 'B']);
  under = 'X';
  fire('pointerup');
  expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: ['B'] });
});

test('a reverse drag gives the route in flight order', () => {
  const { start, fire } = setup();
  start('X');
  under = 'C';
  fire('pointermove');
  under = 'B';
  fire('pointermove');
  under = 'A';
  fire('pointerup');
  expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: ['B', 'C'] });
});

test('hexes that are no systems are passed over', () => {
  const { result } = renderHook(() => useArrowDrag({ activeSystem: 'X', onComplete, onCancel, isSystem: slot => slot !== 'hole' }));
  act(() => result.current.onTilePointerDown('A', { pointerId: 1, clientX: 0, clientY: 0, isPrimary: true, button: 0 } as ReactPointerEvent));
  under = 'hole';
  act(() => { window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1 })); });
  expect(result.current.preview?.path).toEqual(['A']);
  under = 'X';
  act(() => { window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 })); });
  expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: [] });
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

describe('a route in strokes', () => {
  const onPause = vi.fn();
  beforeEach(() => onPause.mockClear());

  function strokes() {
    const { result } = renderHook(() => useArrowDrag({ activeSystem: 'X', onComplete, onCancel, onPause }));
    const press = (slot: string, from?: string[]) => act(() => {
      result.current.onTilePointerDown(slot, { pointerId: 1, clientX: 0, clientY: 0, isPrimary: true, button: 0 } as ReactPointerEvent, from);
    });
    const fire = (type: string, pointerId = 1) => act(() => { window.dispatchEvent(new PointerEvent(type, { pointerId })); });
    return { press, fire, preview: () => result.current.preview };
  }

  test('a finger lifted before the active system keeps the path', () => {
    const { press, fire, preview } = strokes();
    press('A');
    under = 'B';
    fire('pointermove');
    fire('pointerup');
    expect(onPause).toHaveBeenCalledWith(['A', 'B']);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(preview()).toBeNull();
  });

  test('a stroke goes on from the path given and finishes the route', () => {
    const { press, fire, preview } = strokes();
    press('C', ['A', 'B', 'C']);
    expect(preview()?.path).toEqual(['A', 'B', 'C']);
    under = 'X';
    fire('pointermove');
    fire('pointerup');
    expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: ['B', 'C'] });
  });

  test('stepping back in a later stroke shortens the path', () => {
    const { press, fire } = strokes();
    press('C', ['A', 'B', 'C']);
    under = 'B';
    fire('pointermove');
    fire('pointerup');
    expect(onPause).toHaveBeenCalledWith(['A', 'B']);
  });

  test('a press that goes nowhere is a tap: no pause, the tap decides', () => {
    const { press, fire } = strokes();
    press('C', ['A', 'B', 'C']);
    under = 'C';
    fire('pointerup');
    expect(onPause).not.toHaveBeenCalled();
    press('A');
    under = 'A';
    fire('pointerup');
    expect(onPause).not.toHaveBeenCalled();
  });

  test('a second finger drops the stroke only: nothing is paused or finished', () => {
    const { press, fire, preview } = strokes();
    press('C', ['A', 'B', 'C']);
    under = 'D';
    fire('pointermove');
    fire('pointerdown', 2);
    expect(preview()).toBeNull();
    expect(onPause).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('a reverse stroke still finishes on release', () => {
    const { press, fire } = strokes();
    press('X');
    under = 'A';
    fire('pointermove');
    fire('pointerup');
    expect(onComplete).toHaveBeenCalledWith({ from: 'A', via: [] });
    expect(onPause).not.toHaveBeenCalled();
  });
});

test('without an active system nothing starts', () => {
  const { start, arrowPreview } = setup(null);
  start('A');
  expect(arrowPreview()).toBeNull();
});

test('only a primary pointer with the main button starts an arrow', () => {
  const { start, arrowPreview } = setup();
  start('A', { isPrimary: false });
  expect(arrowPreview()).toBeNull();
  start('A', { button: 2 });
  expect(arrowPreview()).toBeNull();
});
