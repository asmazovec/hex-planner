import { expect, test } from 'vitest';
import { reducedMotion } from './motion';

test('energy saving counts as reduced motion', () => {
  expect(reducedMotion()).toBe(false);
  document.documentElement.dataset.energy = 'on';
  expect(reducedMotion()).toBe(true);
  document.documentElement.dataset.energy = 'off';
  expect(reducedMotion()).toBe(false);
});
