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
  expect(saturation(tint)).toBeLessThan(0.7);
});

/** CIE76 colour distance in Lab (D65). */
const lab = (hex: string): number[] => {
  const [r, g, b] = channels(hex).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map(v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
};
const deltaE = (a: string, b: string): number => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

test('the three tints stand clear of the neutral disc and of each other (CIE76 delta E >= 12)', () => {
  const names = ['cultural', 'hazardous', 'industrial'];
  const tints = names.map(trait => colour(`trait-${trait}`));
  tints.forEach((tint, i) => {
    expect(deltaE(tint, colour('token-fill')), `${names[i]} vs neutral`).toBeGreaterThanOrEqual(12);
    for (let j = i + 1; j < tints.length; j += 1) expect(deltaE(tint, tints[j]), `${names[i]} vs ${names[j]}`).toBeGreaterThanOrEqual(12);
  });
});
