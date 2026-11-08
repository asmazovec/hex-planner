import { afterEach, expect, test } from 'vitest';
import { applyAll, blur, choose, effective, ENERGY_ITEMS, flightLoop, flights, lastExport, maxSaving, motion } from './preferences';

afterEach(() => {
  localStorage.clear();
  applyAll();
});

test('each setting keeps its key and is on until turned off; maximum saving is off until turned on', () => {
  expect([flights.read(), flightLoop.read(), motion.read(), blur.read(), maxSaving.read()]).toEqual([true, true, true, true, false]);
  localStorage.setItem('ti4.flights', 'off');
  localStorage.setItem('ti4.flightLoop', 'off');
  localStorage.setItem('ti4.motion', 'off');
  localStorage.setItem('ti4.blur', 'off');
  localStorage.setItem('ti4.energy', 'on');
  expect([flights.read(), flightLoop.read(), motion.read(), blur.read(), maxSaving.read()]).toEqual([false, false, false, false, true]);
});

test('a choice is stored and put on the root element, where the stylesheet reads it', () => {
  choose(motion, false);
  expect(localStorage.getItem('ti4.motion')).toBe('off');
  expect(document.documentElement.dataset.motion).toBe('off');
  expect(motion.applied()).toBe(false);
  choose(flights, false);
  expect(document.documentElement.dataset.flights).toBe('off');
  choose(blur, false);
  expect(document.documentElement.dataset.blur).toBe('off');
});

test('maximum saving turns every item off without touching its choice, which is back once it is off', () => {
  choose(motion, false);
  choose(maxSaving, true);
  expect(ENERGY_ITEMS.map(effective)).toEqual([false, false, false, false]);
  expect([document.documentElement.dataset.flights, document.documentElement.dataset.blur]).toEqual(['off', 'off']);
  expect([flights.read(), flightLoop.read(), motion.read(), blur.read()]).toEqual([true, true, false, true]);
  choose(maxSaving, false);
  expect(ENERGY_ITEMS.map(effective)).toEqual([true, true, false, true]);
  expect(document.documentElement.dataset.flights).toBe('on');
  expect(document.documentElement.dataset.motion).toBe('off');
});

test('maximum saving of the old single switch is read at start', () => {
  localStorage.setItem('ti4.energy', 'on');
  applyAll();
  expect(document.documentElement.dataset.motion).toBe('off');
  expect(document.documentElement.dataset.flights).toBe('off');
});

test('the time of the last file copy is read back, and nothing stored means never', () => {
  expect(lastExport.read()).toBeNull();
  lastExport.write(1234);
  expect(localStorage.getItem('ti4.lastExportAt')).toBe('1234');
  expect(lastExport.read()).toBe(1234);
});
