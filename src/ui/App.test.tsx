import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import { App } from './App';
import { currentLanguage } from '../i18n';

test('меню переключается на английский и запоминает выбор', async () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Партия' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(screen.getByRole('button', { name: 'Game' })).toBeVisible();
  expect(currentLanguage()).toBe('en');
  expect(localStorage.getItem('ti4.lang')).toBe('en');
});
