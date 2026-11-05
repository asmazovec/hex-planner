import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { MapBuilderScreen } from './MapBuilderScreen';

const pack = loadPack(['pok']);
const map = () => useGame.getState().game!.map;

afterEach(cleanup);

beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('1,0', null);
});

async function tapEmptySlot(): Promise<string> {
  const slot = '1,0';
  render(<MapBuilderScreen />);
  await userEvent.click(document.querySelector(`[data-slot="${slot}"]`)!);
  return slot;
}

test('a typed number is placed in the tapped slot', async () => {
  const slot = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[slot]).toBe('25');
});

test('a repeated tile shows a warning and is still placed', async () => {
  useGame.getState().setTile('2,0', '25');
  const slot = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[slot]).toBe('25');
  expect(screen.getByText(/placed more than once: 25/)).toBeVisible();
});

test('an unknown number is rejected with a message', async () => {
  const slot = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '999');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[slot]).toBeUndefined();
  expect(screen.getByRole('alert')).toHaveTextContent('999');
});

test('a hyperlane keeps its side and turns 60 degrees per press', async () => {
  const slot = await tapEmptySlot();
  expect(screen.queryByRole('button', { name: 'Rotate 60°' })).toBeNull();
  await userEvent.type(screen.getByLabelText('Tile number'), '83B');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[slot]).toBe('83B@0');
  await userEvent.click(screen.getByRole('button', { name: 'Rotate 60°' }));
  await userEvent.click(screen.getByRole('button', { name: 'Rotate 60°' }));
  expect(map()[slot]).toBe('83B@2');
});

test('a bare number shared by two sides asks for the side', async () => {
  const slot = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '83');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[slot]).toBeUndefined();
  expect(screen.getByRole('alert')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '83A' }));
  expect(map()[slot]).toBe('83A@0');
});

test('a prefix that is not a number says unknown, not two sides', async () => {
  await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '425');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No tile');
});

test('a fixed template slot can be replaced and cleared, and Game.map overrides the template', async () => {
  render(<MapBuilderScreen />);
  expect(map()['0,0']).toBe('18');
  const hex = () => document.querySelector('[data-slot="0,0"]')!;
  expect(hex()).toHaveAccessibleName('Tile 18');
  await userEvent.click(hex());
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()['0,0']).toBe('25');
  expect(hex()).toHaveAccessibleName('Tile 25');
  await userEvent.click(screen.getByRole('button', { name: 'Clear slot' }));
  expect(map()['0,0']).toBeUndefined();
  expect(hex()).toHaveAccessibleName('Empty slot');
});

test('the side panel has one Close button', async () => {
  await tapEmptySlot();
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
});
