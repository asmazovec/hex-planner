import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { useGame } from '../state/gameStore';
import { deleteGame, listGames, saveGame } from '../storage/db';
import { sampleGame } from '../storage/fixture';
import { App } from './App';
import { ErrorBoundary } from './common/ErrorBoundary';

// The plan of one game fails to draw, as a replay that throws would.
vi.mock('./screens/PlanScreen', async () => {
  const { useGame: store } = await import('../state/gameStore');
  return {
    PlanScreen: () => {
      if (store.getState().game?.id === 'crashes') throw new Error('replay failed');
      return <p>plan screen</p>;
    },
  };
});

beforeEach(async () => {
  setLanguage('en');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const g of await listGames()) await deleteGame(g.id);
  useGame.getState().closeGame();
  useGame.setState({ loadFailure: null, brokenSaves: {} });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLanguage('ru');
});

test('a game that crashes while drawn returns to «Game» with the message, stays saved, and other games still open', async () => {
  await saveGame({ ...sampleGame(), id: 'crashes', name: 'Crashes' });
  await saveGame({ ...sampleGame(), id: 'fine', name: 'Fine' });
  render(<ErrorBoundary><App /></ErrorBoundary>);
  const row = async (name: string) => (await screen.findByText(name, { selector: '.saved-list strong' })).closest('li')!;

  await userEvent.click(within(await row('Crashes')).getByRole('button', { name: 'Open' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Plan & map' }));

  expect(await screen.findByText('The save “Crashes” could not be loaded: replay failed')).toBeVisible();
  expect(document.querySelector('main')).toHaveAttribute('data-screen', 'game');
  expect(useGame.getState().game).toBeNull();
  expect(within(await row('Crashes')).getByText('The save could not be loaded')).toBeVisible();
  expect((await listGames()).map(g => g.id).sort()).toEqual(['crashes', 'fine']);

  await userEvent.click(within(await row('Fine')).getByRole('button', { name: 'Open' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Plan & map' }));
  expect(await screen.findByText('plan screen')).toBeVisible();
  expect(screen.queryByText(/could not be loaded: replay failed/)).toBeNull();
});
