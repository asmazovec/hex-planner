import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import type { Game } from '../testing/old/domain/types';
import { setLanguage } from '../i18n';
import { useGame } from '../state/gameStore';
import { App } from './App';
import { lastView } from './common/preferences';
import { gameNow, seedGame } from '../testing/store';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  localStorage.removeItem('ti4.view');
  useGame.getState().closeGame();
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  useGame.getState().addRound();
  useGame.getState().addRound();
});

const shownScreen = () => document.querySelector('main')!.getAttribute('data-screen');
const roundButton = (n: number) => screen.getByRole('button', { name: `Round ${n}` });

/** The page loads again: the game is gone from memory, the app starts, and only then the game opens from its save. */
function reload(): Game {
  const game = gameNow()!;
  cleanup();
  seedGame(null);
  render(<App />);
  return game;
}

test('the screen and the round of the open game are kept beside the other settings', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
  await userEvent.click(roundButton(2));
  expect(lastView.read(gameNow()!.id)).toEqual({ screen: 'plan', round: 2 });
  expect(localStorage.getItem('ti4.view')).toContain(gameNow()!.id);
});

test('after the page loads again the same game opens on the screen and the round it was left on', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
  await userEvent.click(roundButton(2));
  const game = reload();
  expect(shownScreen()).toBe('game');
  act(() => seedGame(game));
  expect(shownScreen()).toBe('plan');
  expect(roundButton(2)).toHaveAttribute('aria-pressed', 'true');
});

test('a game left on its own screen opens there again', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
  await userEvent.click(screen.getByRole('button', { name: 'Game' }));
  const game = reload();
  act(() => seedGame(game));
  expect(shownScreen()).toBe('game');
});

test('what is kept belongs to one game: another game does not open on it', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
  const game = reload();
  act(() => seedGame({ ...game, id: 'another' }));
  expect(shownScreen()).toBe('game');
  expect(lastView.read('another')).toEqual({ screen: 'game', round: null });
});

test('a kept value that cannot be read is no view at all', () => {
  localStorage.setItem('ti4.view', '{not json');
  expect(lastView.read('any')).toBeNull();
  localStorage.setItem('ti4.view', JSON.stringify({ game: 'any', screen: 'nowhere', round: 'x' }));
  expect(lastView.read('any')).toBeNull();
});
