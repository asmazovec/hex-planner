import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const css = readFileSync('src/ui/theme.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Every rule of the stylesheet, those inside a media query too: its selectors and its declarations. */
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(',').map((selector: string) => selector.trim()).filter(Boolean),
  body,
}));
const SCROLLS = /overflow(-y)?:\s*(auto|scroll)\b|overflow:\s*\w+\s+(auto|scroll)\b/;
const HIDDEN = /scrollbar-width:\s*none/;
const STYLED = /scrollbar-width:\s*thin;\s*scrollbar-color:\s*var\(--border-strong\) transparent/;

describe('the scrollbars of the app', () => {
  const styled = rules.filter(rule => STYLED.test(rule.body));

  test('one rule draws every scrollbar: thin, in the colour of a strong border', () => {
    expect(styled).toHaveLength(1);
  });

  test('everything that scrolls down is in that rule', () => {
    const scrolling = rules.filter(rule => SCROLLS.test(rule.body) && !HIDDEN.test(rule.body)).flatMap(rule => rule.selectors);
    expect(scrolling.length).toBeGreaterThan(8);
    expect(scrolling.filter(selector => !styled[0].selectors.includes(selector))).toEqual([]);
  });

  test('the window that chooses a component scrolls its list, not itself: the title and the search field stay', () => {
    const scrollsDown = (selector: string) => rules.some(rule => rule.selectors.includes(selector) && SCROLLS.test(rule.body));
    expect(scrollsDown('.component-picker')).toBe(false);
    expect(scrollsDown('.component-picker > .component-list')).toBe(true);
  });
});
