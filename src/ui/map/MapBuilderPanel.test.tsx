import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';

const pack = loadPack(['pok']);
const map = () => useGame.getState().game!.map;

afterEach(cleanup);

beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('1,0', null);
});

/** The build mode is on by itself on an empty map, and is turned on otherwise. */
function renderBuilding() {
  render(<PlanScreen />);
  const toggle = screen.getByRole('button', { name: 'Build map' });
  if (toggle.getAttribute('aria-pressed') !== 'true') fireEvent.click(toggle);
}

async function tapEmptySlot(): Promise<string> {
  const slot = '1,0';
  renderBuilding();
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
  renderBuilding();
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

test('the popover has one Close button, and tile details appear only once the slot has a tile', async () => {
  await tapEmptySlot();
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  expect(screen.queryByText('Enemy units')).toBeNull();
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  expect(screen.getByText('Enemy units')).toBeVisible();
});

test('a new game with an empty map opens in build mode; a map with tiles does not', async () => {
  render(<PlanScreen />);
  expect(screen.getByRole('button', { name: 'Build map' })).toHaveAttribute('aria-pressed', 'true');
  cleanup();
  useGame.getState().setTile('2,0', '25');
  render(<PlanScreen />);
  const toggle = screen.getByRole('button', { name: 'Build map' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(document.querySelector('[data-slot="1,0"]')!);
  expect(screen.queryByLabelText('Tile number')).toBeNull();
});

test('the plan stays beside the map while the tile popover is open, and Close closes it', async () => {
  renderBuilding();
  await userEvent.click(document.querySelector('[data-slot="1,0"]')!);
  expect(screen.getByLabelText('Tile number')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByLabelText('Tile number')).toBeNull();
});

test('a tap beside the popover closes it: empty map space and outside the map, not a pan or a press inside', async () => {
  renderBuilding();
  const input = () => screen.queryByLabelText('Tile number');
  const svg = screen.getByRole('group', { name: 'Map' });
  const open = () => userEvent.click(document.querySelector('[data-slot="1,0"]')!);

  await open();
  fireEvent.pointerDown(input()!, { pointerId: 1, button: 0 });
  expect(input()).not.toBeNull();

  fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
  fireEvent.pointerMove(svg, { pointerId: 1, clientX: 60, clientY: 40 });
  fireEvent.pointerUp(svg, { pointerId: 1, clientX: 60, clientY: 40 });
  expect(input()).not.toBeNull();

  fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
  fireEvent.pointerUp(svg, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(input()).toBeNull();

  await open();
  expect(input()).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  expect(input()).toBeNull();
});

test('the map controls stand above the map, not on it', () => {
  renderBuilding();
  const strip = document.querySelector('.map-strip')!;
  const area = document.querySelector('.hexmap-wrap')!;
  for (const name of ['Build map', 'Reset view', 'Forecast', 'Now']) {
    const button = screen.getByRole('button', { name });
    expect(strip.contains(button), name).toBe(true);
    expect(area.contains(button), name).toBe(false);
  }
});

test('a tap on another tile moves the popover there', async () => {
  useGame.getState().setTile('2,0', '25');
  renderBuilding();
  await userEvent.click(document.querySelector('[data-slot="1,0"]')!);
  expect(screen.queryByRole('complementary', { name: 'Tile 25' })).toBeNull();
  await userEvent.click(document.querySelector('[data-slot="2,0"]')!);
  expect(screen.getByRole('complementary', { name: 'Tile 25' })).toBeVisible();
});

test('starting a tactical action leaves build mode', async () => {
  renderBuilding();
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  expect(screen.getByRole('button', { name: 'Build map' })).toHaveAttribute('aria-pressed', 'false');
});
