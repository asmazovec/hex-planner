import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  deleteGame: vi.fn(async () => undefined),
}));

import { loadPack } from '../../../data/loadPack';
import { emptySlots } from '../../../domain/mapBuilder';
import { createGame } from '../../../domain/newGame';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { GameScreen } from '../../screens/GameScreen';
import { PlanScreen } from '../../screens/PlanScreen';

const pack = loadPack(['pok']);
const map = () => useGame.getState().game!.map;
const slot = (key: string) => document.querySelector<SVGGElement>(`[data-slot="${key}"]`)!;
const minimap = () => screen.getByRole('group', { name: 'Minimap' });
const toDraft = (playerCount = 6) => {
  useGame.getState().closeGame();
  useGame.setState({ draft: createGame({ expansions: ['pok'], playerCount, faction: '' }, pack) });
};

afterEach(cleanup);

beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('1,0', null);
});

async function tapEmptySlot(): Promise<string> {
  render(<GameScreen />);
  await userEvent.click(slot('1,0'));
  return '1,0';
}

test('a typed number is placed in the tapped slot, and the slot shows it', async () => {
  const key = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[key]).toBe('25');
  expect(slot(key)).toHaveAccessibleName('Slot with tile 25');
  expect(screen.queryByLabelText('Tile number')).toBeNull();
});

test('the number field takes the focus without scrolling the page to it', async () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  await tapEmptySlot();
  expect(document.activeElement).toBe(screen.getByLabelText('Tile number'));
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(focus.mock.calls.every(([options]) => options?.preventScroll === true)).toBe(true);
  focus.mockRestore();
});

test('every slot shows its tile number; the centre, the homes and the hyperlanes take no taps', () => {
  useGame.getState().setTile('2,0', '25');
  render(<GameScreen />);
  expect(within(minimap()).getByText('25')).toBeInTheDocument();
  expect(within(minimap()).getByText('18')).toBeInTheDocument();
  expect(slot('0,0')).toHaveAttribute('role', 'img');
  expect(slot('0,-3')).not.toHaveAttribute('role', 'button');
  expect(slot('1,0')).toHaveAccessibleName('Empty slot');
});

test('the hyperlanes of the template stand in their slots with their lanes', () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 5, faction: 'arborec' }, pack);
  useGame.getState().setLayout('hyperlanes');
  render(<GameScreen />);
  expect(minimap().querySelectorAll('.mini-fixed .tile-lane').length).toBeGreaterThan(5);
  expect(within(minimap()).getAllByRole('img', { name: /^Tile 8\dA$/ })).toHaveLength(6);
});

test('a repeated tile is warned in the block and is still placed', async () => {
  useGame.getState().setTile('2,0', '25');
  const key = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[key]).toBe('25');
  expect(screen.getByText(/placed more than once: 25/)).toBeVisible();
  expect(slot(key)).toHaveClass('mini-dup');
});

test('the block counts the empty slots until the map is built', () => {
  render(<GameScreen />);
  const empty = emptySlots(useGame.getState().game!, pack);
  expect(screen.getByText(new RegExp(`Empty slots: ${empty.length}\\.`))).toBeVisible();
  act(() => { for (const key of empty) useGame.getState().setTile(key, '25'); });
  expect(screen.queryByText(/Empty slots/)).toBeNull();
  expect(screen.getByText(/The map is built/)).toBeVisible();
});

test('an unknown number is rejected with a message', async () => {
  const key = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '999');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[key]).toBeUndefined();
  expect(screen.getByRole('alert')).toHaveTextContent('999');
});

test('a hyperlane keeps its side and turns 60 degrees per press', async () => {
  const key = await tapEmptySlot();
  expect(screen.queryByRole('button', { name: 'Rotate 60°' })).toBeNull();
  await userEvent.type(screen.getByLabelText('Tile number'), '83B');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[key]).toBe('83B@0');
  await userEvent.click(screen.getByRole('button', { name: 'Rotate 60°' }));
  await userEvent.click(screen.getByRole('button', { name: 'Rotate 60°' }));
  expect(map()[key]).toBe('83B@2');
});

test('a bare number shared by two sides asks for the side', async () => {
  const key = await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '83');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()[key]).toBeUndefined();
  expect(screen.getByRole('alert')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: '83A' }));
  expect(map()[key]).toBe('83A@0');
});

test('a prefix that is not a number says unknown, not two sides', async () => {
  await tapEmptySlot();
  await userEvent.type(screen.getByLabelText('Tile number'), '425');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No tile');
});

test('a placed tile can be cleared', async () => {
  useGame.getState().setTile('2,0', '25');
  render(<GameScreen />);
  await userEvent.click(slot('2,0'));
  await userEvent.click(screen.getByRole('button', { name: 'Clear slot' }));
  expect(map()['2,0']).toBeUndefined();
  expect(slot('2,0')).toHaveAccessibleName('Empty slot');
});

test('the popover has one Close button; a press outside closes it, a press inside or on the minimap does not', async () => {
  await tapEmptySlot();
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  const input = () => screen.queryByLabelText('Tile number');
  fireEvent.pointerDown(input()!, { pointerId: 1, button: 0 });
  expect(input()).not.toBeNull();
  fireEvent.pointerDown(minimap(), { pointerId: 1, button: 0 });
  expect(input()).not.toBeNull();
  fireEvent.pointerDown(document.body, { pointerId: 1, button: 0 });
  expect(input()).toBeNull();
  await userEvent.click(slot('1,0'));
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(input()).toBeNull();
});

test('a tap on another slot moves the popover there, a second tap on the same one closes it', async () => {
  useGame.getState().setTile('2,0', '25');
  await tapEmptySlot();
  expect(screen.getByRole('button', { name: 'Clear slot' })).toBeDisabled();
  await userEvent.click(slot('2,0'));
  expect(screen.getByRole('button', { name: 'Clear slot' })).toBeEnabled();
  await userEvent.click(slot('2,0'));
  expect(screen.queryByLabelText('Tile number')).toBeNull();
});

test('the map is built before the start too, and the tiles stay through a change of expansions', async () => {
  toDraft();
  render(<GameScreen />);
  await userEvent.click(slot('1,0'));
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(useGame.getState().draft.map['1,0']).toBe('25');
  await userEvent.click(screen.getByRole('button', { name: "Thunder's Edge" }));
  expect(useGame.getState().draft.expansions).toContain('te');
  expect(useGame.getState().draft.map['1,0']).toBe('25');
});

test('in a started game the tiles still change, the layout and the seats do not', async () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pack);
  render(<GameScreen />);
  expect(screen.getByRole('radio', { name: 'With hyperlanes' })).toBeDisabled();
  expect(within(minimap()).queryAllByRole('button', { name: /^Player/ })).toEqual([]);
  expect(within(minimap()).getAllByRole('img', { name: /^Player \d,/ })).toHaveLength(4);
  expect(screen.getByText(/the layout and the seats stay/)).toBeVisible();
  await userEvent.click(slot('1,0'));
  await userEvent.type(screen.getByLabelText('Tile number'), '25');
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(map()['1,0']).toBe('25');
});

test('the plan screen has no building tools: a tap opens the big hex, and an unfinished map leads to the game screen', async () => {
  useGame.getState().setTile('2,0', '25');
  const finish = vi.fn();
  render(<PlanScreen onFinishMap={finish} />);
  expect(screen.queryByRole('button', { name: 'Build map' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Paste a Milty string' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Forecast' })).toBeVisible();
  const empty = emptySlots(useGame.getState().game!, pack).length;
  expect(screen.getByRole('status')).toHaveTextContent(`The map is not complete: ${empty} empty slots.`);
  await userEvent.click(screen.getByRole('button', { name: 'Finish the map' }));
  expect(finish).toHaveBeenCalled();
  await userEvent.click(slot('2,0'));
  expect(screen.getByRole('dialog', { name: 'Tile 25' })).toBeVisible();
  expect(screen.queryByLabelText('Tile number')).toBeNull();
});

test('a built map raises no hint on the plan screen', () => {
  for (const key of emptySlots(useGame.getState().game!, pack)) useGame.getState().setTile(key, '25');
  render(<PlanScreen onFinishMap={() => undefined} />);
  expect(screen.queryByRole('button', { name: 'Finish the map' })).toBeNull();
});

async function openImport() {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Paste a Milty string' }));
  return screen.getByLabelText('Milty Draft map string');
}

test('the paste panel closes with the cross and gives its button back', async () => {
  await openImport();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByLabelText('Milty Draft map string')).toBeNull();
  expect(screen.getByRole('button', { name: 'Paste a Milty string' })).toBeVisible();
});

test('a pasted map string fills the map and reports the count', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 999 26');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(map()['0,-1']).toBe('25');
  expect(map()['1,0']).toBe('26');
  expect(screen.getByText(/2 tiles placed/)).toBeTruthy();
  expect(screen.getByText(/Unknown numbers: 999/)).toBeTruthy();
});

test('a string pasted before the start fills the draft', async () => {
  toDraft();
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 999 26');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(useGame.getState().draft.map['0,-1']).toBe('25');
  expect(useGame.getState().draft.map['1,0']).toBe('26');
});

test('an empty field cannot be applied', async () => {
  await openImport();
  expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
});

test('replacing a map that has tiles asks first', async () => {
  useGame.getState().setTile('2,0', '27');
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(map()['2,0']).toBe('27');
  expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Replace map' }));
  expect(map()['2,0']).toBeUndefined();
  expect(map()['0,-1']).toBe('25');
  useGame.getState().undo();
  expect(map()['2,0']).toBe('27');
});

test('a string with nothing placeable cannot be applied', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('999 998 0');
  expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
});

test('the result warns about a wrong token count, dropped tiles and homes', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 26');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getByText(/String has 2 tokens, Milty writes 60/)).toBeTruthy();
  expect(screen.getByText(/Home systems stay empty/)).toBeTruthy();
});

test('a home system in the string is reported as placed', async () => {
  const field = await openImport();
  await userEvent.click(field);
  const tokens = Array.from({ length: 60 }, (_, i) => (i === 18 ? '1' : i === 0 ? '25' : '0'));
  await userEvent.paste(tokens.join(' '));
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(map()['0,-3']).toBe('1');
  expect(screen.getByText(/Home systems placed: 1/)).toBeTruthy();
  expect(screen.queryByText(/Home systems stay empty/)).toBeNull();
});

/** A four-player string with one hyperlane, which makes it a hyperlane layout. */
const laneString = () => {
  const tokens: string[] = Array.from({ length: 60 }, (_, i) => (i === 0 ? '25' : '0'));
  tokens[6 + 8] = '83A0';
  return tokens.join(' ');
};

test('before the start a string with hyperlanes switches a four-player map to the hyperlane layout', async () => {
  toDraft(4);
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste(laneString());
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(useGame.getState().draft.layout).toBe('hyperlanes');
  expect(screen.getByText(/Map layout: With hyperlanes/)).toBeTruthy();
});

test('in a started game a string of another layout cannot be applied', async () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pack);
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste(laneString());
  expect(screen.getByText(/layout of a started game stays/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

test('a string without hyperlanes keeps a standard layout', async () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pack);
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 26');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(useGame.getState().game!.layout).toBe('standard');
  expect(screen.getByText(/Map layout: Standard/)).toBeTruthy();
});

const SET_6P = '4, 12, 14, 16, 18, 19, 22, 24, 28, 30, 33, 34, 37, 41, 44, 46, 48, 49, 55, 58, 61, 63, 66, 68, 71, 72, 74, 76, 78, 79, 80, 102, 106, 110, 113, 115, 117';
const MILTY_36 = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

test('tiles of an expansion that is off are named while typing, and one button turns it on with undo', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 102 106');
  expect(screen.getByText(/102, 106 .*Thunder's Edge/)).toBeVisible();
  expect(screen.queryByText(/Unknown numbers/)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: "Turn on Thunder's Edge" }));
  expect(useGame.getState().game!.expansions).toEqual(['pok', 'te']);
  expect(screen.queryByRole('button', { name: "Turn on Thunder's Edge" })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(map()['1,-1']).toBe('102');
  useGame.getState().undo();
  useGame.getState().undo();
  expect(useGame.getState().game!.expansions).toEqual(['pok']);
});

test('before the start the button turns the expansion on for the draft', async () => {
  toDraft();
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 102 106');
  await userEvent.click(screen.getByRole('button', { name: "Turn on Thunder's Edge" }));
  expect(useGame.getState().draft.expansions).toEqual(['pok', 'te']);
});

test('a sorted list of tiles is a set: the panel says so and places it by seats and ring order', async () => {
  useGame.getState().addExpansion('te');
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste(SET_6P);
  expect(screen.getByText(/no positions/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Place the set' }));
  expect(Object.keys(map())).toHaveLength(37);
  expect(map()['0,-3']).toBe('4');
  expect(screen.getByText(/30 tiles placed/)).toBeVisible();
  expect(screen.getByText(/Home systems placed: 6/)).toBeVisible();
  expect(screen.queryByText(/String has/)).toBeNull();
  expect(screen.queryByText(/Expected/)).toBeNull();
});

test('a complete six-player string of 36 tokens raises no note about the count', async () => {
  useGame.getState().addExpansion('te');
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste(MILTY_36);
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getByText(/30 tiles placed/)).toBeVisible();
  expect(screen.queryByText(/String has/)).toBeNull();
  expect(screen.queryByText(/Expected/)).toBeNull();
});

test('tiles of an expansion that is off stay listed after Apply', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('25 102');
  await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getByText(/102 belong to Thunder's Edge/)).toBeVisible();
});

test('a set that would place nothing cannot be placed', async () => {
  const field = await openImport();
  await userEvent.click(field);
  await userEvent.paste('901 902 903 904 905 906 907 908 909 910');
  expect(screen.getByText(/no positions/)).toBeVisible();
  expect((screen.getByRole('button', { name: 'Place the set' }) as HTMLButtonElement).disabled).toBe(true);
});
