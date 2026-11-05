import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, test, expect } from 'vitest';
import { App } from './App';
import { setLanguage, currentLanguage } from '../i18n';
import { saveGame } from '../storage/db';
import { sampleGame } from '../storage/fixture';

afterEach(cleanup);

test('меню переключается на английский и запоминает выбор', async () => {
  setLanguage('ru');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Партия' })).toBeVisible();
  await userEvent.selectOptions(screen.getByLabelText('Язык интерфейса'), 'en');
  expect(screen.getByRole('button', { name: 'Game' })).toBeVisible();
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

test('the menu holds the game and the plan with its map, without a language switch in the header', () => {
  setLanguage('en');
  render(<App />);
  const names = within(screen.getByRole('navigation')).getAllByRole('button').map(b => b.textContent);
  expect(names).toEqual(['Game', 'Plan & map']);
  expect(screen.queryByRole('button', { name: 'EN' })).toBeNull();
  setLanguage('ru');
});
