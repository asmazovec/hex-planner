import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, test, expect } from 'vitest';
import { App } from './App';
import { setLanguage, currentLanguage } from '../i18n';
import { saveGame } from '../storage/db';
import { sampleGame } from '../storage/fixture';

afterEach(cleanup);

test('меню переключается на английский и запоминает выбор', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Партия' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(screen.getByRole('button', { name: 'Game' })).toBeVisible();
  expect(currentLanguage()).toBe('en');
  expect(localStorage.getItem('ti4.lang')).toBe('en');
});

test('a game with a different data version shows a warning on every screen', async () => {
  setLanguage('en');
  await saveGame({ ...sampleGame(), dataVersion: 'old' });
  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
  expect(await screen.findByRole('status')).toHaveTextContent('different data version');
  await userEvent.click(screen.getByRole('button', { name: 'Rivals' }));
  expect(screen.getByText(/different data version/)).toBeVisible();
});

test('the language can be changed in Settings', async () => {
  setLanguage('ru');
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Настройки' }));
  await userEvent.selectOptions(screen.getByLabelText('Язык интерфейса'), 'en');
  expect(screen.getByRole('button', { name: 'Game' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeVisible();
  expect(localStorage.getItem('ti4.lang')).toBe('en');
});
