import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { setLanguage } from '../../i18n';
import { routeShapes } from './geometry';
import { RouteArrows, type Arrow } from './RouteArrows';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);

const arrow = (key: string, number: number | undefined): Arrow => ({
  key, number, from: '0,1', via: [], to: '0,0', pickups: [], tone: 'planned', shape: routeShapes([['0,1', '0,0']])[0],
});

const badges = (arrows: Arrow[]): (string | null)[] => {
  const { container } = render(<svg><RouteArrows arrows={arrows} bounds={{ x: -500, y: -500, width: 1000, height: 1000 }} /></svg>);
  return [...container.querySelectorAll('.route-badge-number')].map(node => node.textContent);
};

test('the badge of an arrow carries the number of its tactical action', () => {
  expect(badges([arrow('a', 2)])).toEqual(['2']);
});

/**
 * Warfare's free tactical action is part of its card's strategic action (LRR 83: a strategic action resolves the
 * card's primary ability), so it has no number among the player's tactical actions: its badge says whose action it
 * is, the strategy card's, and is never an empty hexagon.
 */
test('the arrow of a tactical action taken from a strategy card is marked as the card\'s, not left empty', () => {
  expect(badges([arrow('a', undefined)])).toEqual(['S']);
  setLanguage('ru');
  cleanup();
  expect(badges([arrow('a', undefined)])).toEqual(['С']);
});
