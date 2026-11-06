import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { sampleGame } from '../../storage/fixture';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('./download', () => ({ downloadGame: vi.fn() }));
import { downloadGame } from './download';

function Bomb(): never {
  throw new Error('boom');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  useGame.setState({ game: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLanguage('ru');
});

test('a crash shows the error and exports the open game', async () => {
  setLanguage('en');
  const game = sampleGame();
  useGame.setState({ game });
  render(<ErrorBoundary><Bomb /></ErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong: boom');
  await userEvent.click(screen.getByRole('button', { name: 'Export' }));
  expect(downloadGame).toHaveBeenCalledWith(game);
});

test('the message is in the chosen language, and with no open game there is nothing to export', () => {
  setLanguage('ru');
  render(<ErrorBoundary><Bomb /></ErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так: boom');
  expect(screen.queryByRole('button')).toBeNull();
});

test('without an error the children render', () => {
  render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
  expect(screen.getByText('fine')).toBeVisible();
});
