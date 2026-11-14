import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { sampleGame } from '../../testing/fixture';
import { ErrorBoundary } from './ErrorBoundary';
import { gameNow, seedGame, useOldGame } from '../../testing/store';

function Bomb(): never {
  throw new Error('boom');
}

/** Draws like a screen of the open game: crashes while one is open, draws the game screen once it is closed. */
function GameBomb() {
  const game = useOldGame();
  if (game) throw new Error('replay failed');
  return <p>game screen</p>;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  seedGame(null);
  useGame.setState({ loadFailure: null, brokenSaves: {} });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLanguage('ru');
});

test('a crash of an open game closes it, marks it as failed and draws the app again instead of a blank page', async () => {
  const game = sampleGame();
  useGame.setState({ saved: game });
  render(<ErrorBoundary><GameBomb /></ErrorBoundary>);
  expect(await screen.findByText('game screen')).toBeVisible();
  expect(gameNow()).toBeNull();
  expect(useGame.getState().loadFailure).toEqual({ id: game.id, error: 'replay failed' });
  expect(useGame.getState().brokenSaves).toEqual({ [game.id]: 'replay failed' });
});

test('a crash that stays with no game open shows the error, without a loop', () => {
  setLanguage('en');
  useGame.setState({ saved: sampleGame() });
  render(<ErrorBoundary><Bomb /></ErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong: boom');
  expect(gameNow()).toBeNull();
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
