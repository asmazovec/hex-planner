import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const css = readFileSync(join('src', 'ui', 'theme.css'), 'utf8');
const colour = (name: string): string => {
  const hit = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!hit) throw new Error(`--${name} is not a hex colour in theme.css`);
  return hit[1];
};
const channels = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const saturation = (hex: string): number => {
  const max = Math.max(...channels(hex));
  return max === 0 ? 0 : (max - Math.min(...channels(hex))) / max;
};

test.each(['cultural', 'hazardous', 'industrial'])('the %s tint keeps the gold and blue values readable and stays dim', trait => {
  const tint = colour(`trait-${trait}`);
  expect(contrast(colour('gold'), tint), 'resources').toBeGreaterThanOrEqual(4.5);
  expect(contrast(colour('accent'), tint), 'influence').toBeGreaterThanOrEqual(4.5);
  expect(luminance(tint)).toBeLessThan(0.1);
  expect(saturation(tint)).toBeLessThan(0.5);
});

test('the three tints differ from each other and from the neutral disc', () => {
  const tints = ['cultural', 'hazardous', 'industrial'].map(trait => colour(`trait-${trait}`));
  for (const tint of tints) expect(tint).not.toBe(colour('token-fill'));
  expect(new Set(tints).size).toBe(3);
});
