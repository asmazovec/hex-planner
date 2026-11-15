import { afterEach, describe, expect, test } from 'vitest';
import { PLAYER_COLOURS } from '../units/sprites';
import { readFileSync } from 'node:fs';
import { accentOf, applyAccent, contrast } from './accent';

const theme = readFileSync('src/ui/theme.css').toString('utf8');
const themed = (name: string): string => new RegExp(`${name}: (#[0-9a-f]{6});`).exec(theme)![1];
const SURFACES = ['--bg', '--surface', '--surface-2'].map(themed);

afterEach(() => applyAccent(null));

describe('the accent of a player colour', () => {
  test('is that colour itself, with every shade of the accent derived from it', () => {
    for (const colour of PLAYER_COLOURS) {
      const accent = accentOf(colour);
      expect(accent['--accent']).toBe(colour);
      expect(Object.keys(accent).sort()).toEqual(['--accent', '--accent-deep', '--accent-faint', '--accent-soft', '--accent-soft-hover', '--accent-solid', '--accent-solid-hover', '--accent-text']);
    }
  });

  test('the text on a solid accent fill reads on it, on its hover too: dark on a light fill, white on a dark one', () => {
    for (const colour of PLAYER_COLOURS) {
      const accent = accentOf(colour);
      expect(contrast(accent['--accent-text'], accent['--accent-solid']), colour).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent['--accent-text'], accent['--accent-solid-hover']), colour).toBeGreaterThanOrEqual(4.5);
    }
    // Yellow and green fills are light: white would not read on them.
    expect(accentOf('#e8c56a')['--accent-text']).not.toBe('#ffffff');
    expect(accentOf('#74d09a')['--accent-text']).not.toBe('#ffffff');
  });

  test('the accent as a line or a word reads on every surface, and the page text reads on the soft fills', () => {
    const text = themed('--text');
    for (const colour of PLAYER_COLOURS) {
      const accent = accentOf(colour);
      for (const surface of SURFACES) expect(contrast(accent['--accent'], surface), colour).toBeGreaterThanOrEqual(4.5);
      for (const fill of ['--accent-soft', '--accent-soft-hover', '--accent-faint', '--accent-deep']) expect(contrast(text, accent[fill]), `${colour} ${fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the first colour is the blue the theme starts with: its shades stay close to the theme\'s own', () => {
    const accent = accentOf(PLAYER_COLOURS[0]);
    const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (const name of ['--accent', '--accent-solid', '--accent-soft', '--accent-solid-hover', '--accent-soft-hover', '--accent-faint', '--accent-deep']) {
      const [made, kept] = [channels(accent[name]), channels(themed(name))];
      made.forEach((value, i) => expect(Math.abs(value - kept[i]), name).toBeLessThanOrEqual(14));
    }
    expect(accent['--accent-text']).toBe('#ffffff');
  });
});

describe('the accent on the page', () => {
  const root = () => document.documentElement.style;
  test('a colour sets every accent variable on the root, and none takes them off: the theme\'s blue stands again', () => {
    applyAccent('#e8c56a');
    expect(root().getPropertyValue('--accent')).toBe('#e8c56a');
    expect(root().getPropertyValue('--accent-solid')).toBe(accentOf('#e8c56a')['--accent-solid']);
    applyAccent(null);
    expect(root().getPropertyValue('--accent')).toBe('');
    expect(root().getPropertyValue('--accent-text')).toBe('');
  });
});
