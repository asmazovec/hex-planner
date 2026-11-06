import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, test, expect } from 'vitest';
import { useGame } from '../state/gameStore';
import { App } from './App';
import { setLanguage, currentLanguage } from '../i18n';
import { saveGame } from '../storage/db';
import { sampleGame } from '../storage/fixture';

afterEach(cleanup);

beforeEach(() => useGame.getState().closeGame());

test('язык переключается на английский и запоминается', async () => {
  setLanguage('ru');
  render(<App />);
  expect(screen.getByRole('radio', { name: 'English' })).toBeVisible();
  await userEvent.click(screen.getByRole('radio', { name: 'English' }));
  expect(screen.getByText('Language')).toBeVisible();
  expect(currentLanguage()).toBe('en');
  expect(localStorage.getItem('ti4.lang')).toBe('en');
});

test('a game with a different data version shows a warning on every screen', async () => {
  setLanguage('en');
  await saveGame({ ...sampleGame(), dataVersion: 'old' });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
  expect(await screen.findByText(/different data version/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
  expect(screen.getByText(/different data version/)).toBeVisible();
});

test('without a game there is no menu and no way to the plan; leaving a game comes back to the game screen', async () => {
  setLanguage('en');
  await saveGame(sampleGame());
  render(<App />);
  expect(screen.queryByRole('navigation')).toBeNull();
  await userEvent.click((await screen.findAllByRole('button', { name: 'Open' }))[0]);
  await userEvent.click(await screen.findByRole('button', { name: 'Plan & map' }));
  expect(screen.getByRole('button', { name: 'Plan & map' })).toHaveAttribute('aria-current', 'page');
  act(() => useGame.getState().closeGame());
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.getByText('Language')).toBeVisible();
});

test('the menu holds the game and the plan with its map, without a language switch in the header', async () => {
  setLanguage('en');
  await saveGame(sampleGame());
  render(<App />);
  await userEvent.click((await screen.findAllByRole('button', { name: 'Open' }))[0]);
  const names = within(screen.getByRole('navigation')).getAllByRole('button').map(b => b.getAttribute('aria-label')).slice(0, 2);
  expect(names).toEqual(['Game', 'Plan & map']);
  expect(screen.queryByRole('button', { name: 'EN' })).toBeNull();
  setLanguage('ru');
});
