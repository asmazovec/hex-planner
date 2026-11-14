import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, test, expect } from 'vitest';
import { loadPack } from '../data/loadPack';
import { emptySlots } from '../domain/mapBuilder';
import { factionCode } from '../domain/shareLink';
import { useGame } from '../state/gameStore';
import { App } from './App';
import { setLanguage, currentLanguage } from '../i18n';
import { saveGame } from '../storage/db';
import { legacySampleGame, sampleGame } from '../testing/fixture';
import { savedOf } from '../testing/legacySave';

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

test('the address of an open game is its link, it follows the game, and it clears on leaving', () => {
  const pack = loadPack(['pok']);
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  useGame.getState().setName('Friday');
  const entries = window.history.length;
  render(<App />);
  const params = () => new URLSearchParams(window.location.search);
  expect(params().get('name')).toBe('Friday');
  expect(params().get('exp')).toBe('pok');
  expect(params().get('factions')).toBe(`${factionCode('sol')},-,-`);
  act(() => useGame.getState().setTile('0,-1', '25'));
  expect(params().get('map')?.split(' ')[0]).toBe('25');
  act(() => useGame.getState().setOpponent(0, { faction: 'hacan' }));
  expect(params().get('factions')).toBe(`${factionCode('sol')},${factionCode('hacan')},-`);
  expect(window.history.length).toBe(entries);
  act(() => useGame.getState().closeGame());
  expect(window.location.search).toBe('');
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

test('opening a save with every seat and tile set goes to the plan and map; an unfinished one stays on the game screen (#8)', async () => {
  setLanguage('en');
  const pack = loadPack(['pok']);
  const unfinished = { ...sampleGame(), id: 'unfinished', name: 'Unfinished' };
  await saveGame(unfinished);
  render(<App />);
  await userEvent.click(within((await screen.findByText('Unfinished')).closest('li')!).getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('button', { name: 'Game' })).toHaveAttribute('aria-current', 'page');
  act(() => useGame.getState().closeGame());
  cleanup();

  const tiles = Object.keys(pack.tiles).filter(id => /^\d+$/.test(id) && Number(id) >= 19 && Number(id) <= 80);
  const ready = { ...legacySampleGame(), id: 'ready', name: 'Ready' };
  ready.map = { ...ready.map, ...Object.fromEntries(emptySlots(ready, pack).map((key, i) => [key, tiles[i]])) };
  ready.opponents = ready.opponents.map((o, i) => ({ ...o, faction: ['hacan', 'jolnar', 'naalu'][i] }));
  await saveGame(savedOf(ready));
  render(<App />);
  await userEvent.click(within((await screen.findByText('Ready')).closest('li')!).getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('button', { name: 'Plan & map' })).toHaveAttribute('aria-current', 'page');
});
