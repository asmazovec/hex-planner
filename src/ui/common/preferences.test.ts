import { afterEach, expect, test } from 'vitest';
import { blur, energy, flightLoop, lastExport } from './preferences';

afterEach(() => localStorage.clear());

test('each setting keeps its key and its default', () => {
  expect([blur.read(), energy.read(), flightLoop.read()]).toEqual([true, false, true]);
  localStorage.setItem('ti4.blur', 'off');
  localStorage.setItem('ti4.energy', 'on');
  localStorage.setItem('ti4.flightLoop', 'off');
  expect([blur.read(), energy.read(), flightLoop.read()]).toEqual([false, true, false]);
});

test('a choice is stored and put on the root element, where the stylesheet reads it', () => {
  energy.write(true);
  expect(localStorage.getItem('ti4.energy')).toBe('on');
  expect(document.documentElement.dataset.energy).toBe('on');
  expect(energy.applied()).toBe(true);
  blur.write(false);
  expect(document.documentElement.dataset.blur).toBe('off');
  energy.write(false);
});

test('the time of the last file copy is read back, and nothing stored means never', () => {
  expect(lastExport.read()).toBeNull();
  lastExport.write(1234);
  expect(localStorage.getItem('ti4.lastExportAt')).toBe('1234');
  expect(lastExport.read()).toBe(1234);
});
