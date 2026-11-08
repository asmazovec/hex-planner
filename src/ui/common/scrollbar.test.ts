import { describe, expect, test } from 'vitest';
import { measureScrollbar } from './scrollbar';

describe('measureScrollbar', () => {
  test('puts the width of a scrollbar on the root, and removes its probe', () => {
    const width = measureScrollbar();
    expect(width).toBeGreaterThanOrEqual(0);
    expect(document.documentElement.style.getPropertyValue('--scrollbar')).toBe(`${width}px`);
    expect(document.body.children.length).toBe(0);
  });
});
