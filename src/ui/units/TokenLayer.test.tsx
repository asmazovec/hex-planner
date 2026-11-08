import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { PlacedStack } from '../../domain/hexLayout';
import { TokenLayer } from './TokenLayer';

afterEach(cleanup);

const stack = (count: number, x = 0): PlacedStack => ({ kind: 'infantry', owner: 'me', count, key: 'me|infantry|0', planet: 0, x, y: 0, size: 20 });
const layer = (items: PlacedStack[]) => (
  <svg><TokenLayer items={items} colourOf={() => '#7fb2ff'} labelOf={item => `Infantry ${item.count}`} /></svg>
);
const motions = () => [...document.querySelectorAll('.tk > g')].map(g => `${g.getAttribute('class') ?? 'still'}:${g.textContent}`);

test('a new count is the old token collapsing while the new one grows in its place', () => {
  const { rerender } = render(layer([stack(4)]));
  expect(motions()).toEqual(['still:4']);
  rerender(layer([stack(2)]));
  expect(motions().sort()).toEqual(['tk-in:2', 'tk-out:4']);
});

test('a token that only moves stays the same node and slides', () => {
  const { rerender } = render(layer([stack(3)]));
  const node = document.querySelector('.tk');
  rerender(layer([stack(3, 10)]));
  expect(document.querySelector('.tk')).toBe(node);
  expect(motions()).toEqual(['still:3']);
});

test('the last of a kind collapses and is gone', () => {
  const { rerender } = render(layer([stack(2)]));
  rerender(layer([]));
  expect(motions()).toEqual(['tk-out:2']);
});
