import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { useGame } from '../../state/gameStore';
import { deleteGame, listGames, saveGame } from '../../storage/db';
import { exportGame } from '../../storage/transfer';
import { sampleGame } from '../../storage/fixture';
import { setLanguage } from '../../i18n';
import { GameScreen } from './GameScreen';

afterEach(cleanup);

beforeEach(async () => {
  setLanguage('en');
  for (const g of await listGames()) await deleteGame(g.id);
  useGame.setState({ game: null, saveError: null });
});

const factionNames = () =>
  within(screen.getByLabelText('Your faction')).getAllByRole('option').map(o => o.textContent);

test('new game with pok and te stores both expansions', async () => {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Prophecy of Kings' }));
  await userEvent.click(screen.getByRole('checkbox', { name: "Thunder's Edge" }));
  await userEvent.click(screen.getByRole('button', { name: 'Start game' }));
  const game = useGame.getState().game!;
  expect(game.expansions).toEqual(['pok', 'te']);
  expect(game.dataVersion).toBe(loadPack(['pok', 'te']).version);
});

test('faction list follows the chosen expansions', async () => {
  render(<GameScreen />);
  const base = factionNames();
  expect(base).toHaveLength(Object.keys(loadPack([]).factions).length);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Prophecy of Kings' }));
  expect(factionNames()).toHaveLength(Object.keys(loadPack(['pok']).factions).length);
  expect(factionNames().length).toBeGreaterThan(base.length);
});

test('importing a broken file shows the reason and keeps saved games', async () => {
  await saveGame(sampleGame());
  render(<GameScreen />);
  const file = new File(['{ not json'], 'bad.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
  expect(await listGames()).toHaveLength(1);
  expect(useGame.getState().game).toBeNull();
});

test('importing a game whose id exists saves it as a new game', async () => {
  const game = sampleGame();
  await saveGame(game);
  render(<GameScreen />);
  const file = new File([exportGame(game)], 'g.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  await waitFor(async () => expect(await listGames()).toHaveLength(2));
  expect(useGame.getState().game!.id).not.toBe(game.id);
});

test('a failing save during import shows an error instead of throwing', async () => {
  const db = await import('../../storage/db');
  const spy = vi.spyOn(db, 'saveGame').mockRejectedValueOnce(new Error('quota exceeded'));
  render(<GameScreen />);
  const file = new File([exportGame(sampleGame())], 'g.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('quota exceeded');
  spy.mockRestore();
});

test('a just started game appears in the saved list', async () => {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(await screen.findByRole('button', { name: 'Open' })).toBeVisible();
});
