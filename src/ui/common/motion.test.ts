import { afterEach, expect, test, vi } from 'vitest';
import { playsFlights, reducedMotion } from './motion';

afterEach(() => {
  delete document.documentElement.dataset.motion;
  delete document.documentElement.dataset.flights;
  vi.unstubAllGlobals();
});

test('smooth motion turned off counts as reduced motion, and leaves the flights alone', () => {
  expect(reducedMotion()).toBe(false);
  document.documentElement.dataset.motion = 'off';
  expect(reducedMotion()).toBe(true);
  expect(playsFlights()).toBe(true);
  document.documentElement.dataset.motion = 'on';
  expect(reducedMotion()).toBe(false);
});

test('flights turned off play no flight, and leave the motion alone', () => {
  document.documentElement.dataset.flights = 'off';
  expect(playsFlights()).toBe(false);
  expect(reducedMotion()).toBe(false);
});

test('the system setting turns off both', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  expect(reducedMotion()).toBe(true);
  expect(playsFlights()).toBe(false);
});
