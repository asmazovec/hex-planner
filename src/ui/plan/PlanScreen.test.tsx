import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import type { Entry } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';

const pack = loadPack(['pok']);
const HOME = '1,0';
const TARGET = '0,1';

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('0,-3', null);
  useGame.getState().setTile(HOME, '5');
  useGame.getState().setTile(TARGET, '25');
});

const game = () => useGame.getState().game!;
const plan = () => game().plans.find(p => p.id === game().activePlanId)!;
const entries = () => plan().rounds.at(-1)!.entries;
const tactical = () => entries()[0] as Extract<Entry, { type: 'tactical' }>;
const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;
const cell = (name: string) => within(screen.getByRole('group', { name: 'Totals, now and forecast' })).getByRole('group', { name });

async function chooseSystem(slot = TARGET) {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  await userEvent.click(tile(slot));
}

test('without a game it asks for one', () => {
  useGame.setState({ game: null });
  render(<PlanScreen />);
  expect(screen.getByText('Start or open a game first.')).toBeVisible();
});

test('choosing a system creates the entry, spends a token and marks the tile', async () => {
  render(<PlanScreen />);
  expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  expect(entries()).toHaveLength(0);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the system');
  await userEvent.click(tile(TARGET));
  expect(tactical()).toMatchObject({ type: 'tactical', systemId: TARGET, phase: 'action', status: 'planned' });
  expect(cell('Tactic')).toHaveTextContent('3 → 2');
  expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: 'Command token' })).toBeInTheDocument();
  expect(tile(TARGET)).toHaveClass('tile-active');
});

test('cancelling the system choice leaves no entry', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(entries()).toHaveLength(0);
  await userEvent.click(tile(TARGET));
  expect(screen.getByRole('complementary', { name: 'Tile 25' })).toBeVisible();
});

test('a source can be added by taps, and opens the picker with a suggestion', async () => {
  await chooseSystem();
  await userEvent.click(tile(HOME));
  expect(tactical().moves).toEqual([]);
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  await userEvent.click(tile(HOME));
  expect(tactical().moves).toEqual([{ from: HOME, units: { carrier: 1, cruiser: 1, fighter: 2, infantry: 2 } }]);
  expect(screen.getByText('Capacity: 4 of 4')).toBeVisible();
  expect(document.querySelector('line.arrow')).toBeInTheDocument();
});

test('an arrow drag opens the same picker, in both directions', async () => {
  await chooseSystem();
  document.elementFromPoint = () => tile(TARGET);
  fireEvent.pointerDown(tile(HOME), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves.map(m => m.from)).toEqual([HOME]);
  expect(screen.getByText('Capacity: 4 of 4')).toBeVisible();

  useGame.getState().updateEntry(tactical().id, { moves: [] });
  document.elementFromPoint = () => tile(HOME);
  fireEvent.pointerDown(tile(TARGET), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves.map(m => m.from)).toEqual([HOME]);
});

test('outside the editor a tile tap opens its sheet and drags do nothing', async () => {
  render(<PlanScreen />);
  document.elementFromPoint = () => tile(TARGET);
  fireEvent.pointerDown(tile(HOME), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(entries()).toHaveLength(0);
  await userEvent.click(tile(TARGET));
  expect(screen.getByRole('complementary', { name: 'Tile 25' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('complementary', { name: 'Tile 25' })).toBeNull();
});

test('landing puts ground units on a planet and changes its control', async () => {
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  await userEvent.click(tile(HOME));
  await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
  const planet = screen.getByRole('group', { name: 'Landing on Quann' });
  await userEvent.click(within(planet).getByRole('button', { name: 'Add one Infantry' }));
  expect(tactical().landings).toEqual([{ planetId: 'quann', units: { infantry: 1 } }]);
  expect(within(tile(TARGET) as HTMLElement).getByRole('group', { name: /Quann: .*yours/ })).toBeInTheDocument();
});

test('production is unavailable without a dock', async () => {
  await chooseSystem();
  expect(screen.getByText('No space dock in this system.')).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Build Carrier' })).toBeNull();
});

test('production picks the payment by itself and warns about the shortfall; manual choice stops the auto pick', async () => {
  await chooseSystem(HOME);
  const row = within(screen.getByRole('group', { name: 'Build' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Cruiser' }));
  expect(tactical().production).toEqual({ cruiser: 1 });
  expect(tactical().payment).toEqual({ planets: ['nestphar'], tradeGoods: 0 });
  expect(screen.getByText(/Cost 2/)).toBeVisible();
  expect(screen.queryByText(/short by/)).toBeNull();
  await userEvent.click(row.getByRole('button', { name: 'Add one Cruiser' }));
  expect(screen.getByText(/short by 1/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
  await userEvent.click(screen.getByRole('button', { name: /Nestphar/ }));
  expect(tactical().payment.planets).toEqual([]);
  await userEvent.click(row.getByRole('button', { name: 'Remove one Cruiser' }));
  expect(tactical().payment.planets).toEqual([]);
  await userEvent.click(screen.getByRole('button', { name: 'Pick automatically' }));
  expect(tactical().payment.planets).toEqual(['nestphar']);
});

test('warnings come only from the projection', async () => {
  await chooseSystem();
  expect(screen.queryByRole('list', { name: 'Warnings' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
  await userEvent.click(tile(HOME));
  const [infantry] = screen.getAllByRole('group', { name: 'Infantry' });
  await userEvent.click(within(infantry).getByRole('button', { name: 'Add one Infantry' }));
  expect(within(screen.getByRole('list', { name: 'Warnings' })).getAllByRole('listitem').length).toBeGreaterThan(0);
  expect(document.querySelector('line.arrow-warn')).toBeInTheDocument();
});

test('Done returns to the plan, and tapping the entry reopens the editor', async () => {
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /Tactical action · 25/ }));
  expect(screen.getByRole('button', { name: 'Done editing' })).toBeVisible();
});

test('the Forecast / Now switch changes what the map shows', async () => {
  useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
  render(<PlanScreen />);
  const token = () => within(tile(TARGET) as HTMLElement).queryByRole('img', { name: 'Command token' });
  expect(token()).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Now' }));
  expect(screen.getByRole('button', { name: 'Now' })).toHaveAttribute('aria-pressed', 'true');
  expect(token()).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Forecast' }));
  expect(token()).toBeInTheDocument();
});

test('rounds switch and a new round can be added; the map shows that round', async () => {
  useGame.getState().addEntry(1, { type: 'pass' }, 'action');
  render(<PlanScreen />);
  expect(screen.getByRole('listitem', { name: 'Pass' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Add round' }));
  expect(plan().rounds).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Round 2' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('listitem', { name: 'Pass' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Round 1' }));
  expect(screen.getByRole('listitem', { name: 'Pass' })).toBeVisible();
});

test('the status phase entry distributes tokens', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Status phase tokens' }));
  const entry = entries()[0];
  expect(entry).toMatchObject({ type: 'statusTokens', phase: 'status', tactic: 0, fleet: 0, strategy: 0 });
  const row = within(screen.getByRole('listitem', { name: 'Status phase tokens' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Tactic' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Fleet' }));
  expect(entries()[0]).toMatchObject({ tactic: 1, fleet: 1, strategy: 0 });
  expect(cell('Tactic')).toHaveTextContent('3 → 4');
  expect(screen.getAllByRole('button', { name: 'Status phase tokens' })).toHaveLength(1);
});

test('a manual adjustment has a label and changes values, including units', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Manual adjustment' }));
  const row = within(screen.getByRole('listitem', { name: /Manual adjustment/ }));
  await userEvent.type(row.getByRole('textbox', { name: 'Label' }), 'Card: +2{Enter}');
  await userEvent.click(row.getByRole('button', { name: 'Add one Trade goods' }));
  expect(entries()[0]).toMatchObject({ label: 'Card: +2', delta: { tradeGoods: 1 } });
  expect(cell('Trade goods')).toHaveTextContent('0 → 1');
  await userEvent.selectOptions(row.getByRole('combobox', { name: 'System' }), HOME);
  await userEvent.click(row.getByRole('button', { name: 'Remove one Carrier' }));
  expect(entries()[0]).toMatchObject({ delta: { units: { systemId: HOME, units: { carrier: -1 } } } });
});

test('a component action keeps a note', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Component action' }));
  const row = within(screen.getByRole('listitem', { name: /Component action/ }));
  await userEvent.type(row.getByRole('textbox', { name: 'Note' }), 'Plague{Enter}');
  expect(entries()[0]).toMatchObject({ type: 'component', note: 'Plague' });
});

test('the plan name can be changed', async () => {
  render(<PlanScreen />);
  const input = screen.getByRole('textbox', { name: 'Plan name' });
  expect(input).toHaveValue('Plan 1');
  await userEvent.clear(input);
  await userEvent.type(input, 'Rush{Enter}');
  expect(plan().name).toBe('Rush');
  expect(screen.getByRole('tab', { name: /Rush/, selected: true })).toBeVisible();
});

test('undo of a just created entry closes its editor', async () => {
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(entries()).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
});

test('the system of an entry cannot be changed in place', async () => {
  await chooseSystem();
  expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
});

test('an arrow to or from an empty slot does nothing', async () => {
  const EMPTY = '-1,0';
  await chooseSystem();
  document.elementFromPoint = () => tile(EMPTY);
  fireEvent.pointerDown(tile(TARGET), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  document.elementFromPoint = () => tile(TARGET);
  fireEvent.pointerDown(tile(EMPTY), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves).toEqual([]);
  expect(screen.queryByRole('button', { name: 'Close picker' })).toBeNull();
});

test('Add action stays pinned below the scrolling part of the panel', () => {
  render(<PlanScreen />);
  const add = screen.getByRole('button', { name: 'Add action' });
  expect(add.closest('.plan-footer')).not.toBeNull();
  expect(add.closest('.plan-scroll')).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Plan name' }).closest('.plan-scroll')).not.toBeNull();
});

test('the card list stays collapsed after the editor closes when a main card exists', async () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(screen.queryByRole('button', { name: /Warfare/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Trade/ })).toBeVisible();
});

test('the build list shows the price of each unit', async () => {
  await chooseSystem(HOME);
  const build = within(screen.getByRole('group', { name: 'Build' }));
  expect(build.getByRole('group', { name: 'Cruiser' })).toHaveTextContent('cost 2');
  expect(build.getByRole('group', { name: 'Fighter' })).toHaveTextContent('cost 0.5');
});

test('status tokens do not go below zero', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Status phase tokens' }));
  const row = within(screen.getByRole('listitem', { name: 'Status phase tokens' }));
  expect(row.getByRole('button', { name: 'Remove one Tactic' })).toBeDisabled();
});

test.each(['Plan 1', 'Rush'])('an empty name falls back to the default, starting from %s', async start => {
  useGame.getState().renamePlan(start);
  render(<PlanScreen />);
  const input = screen.getByRole('textbox', { name: 'Plan name' });
  await userEvent.clear(input);
  await userEvent.type(input, '   {Enter}');
  expect(plan().name).toBe('Plan 1');
  expect(screen.getByRole('textbox', { name: 'Plan name' })).toHaveValue('Plan 1');
  expect(screen.getByRole('tab', { name: /Plan 1/, selected: true })).toBeVisible();
});

test('the players button opens the same list of cards as a panel, and closes it', async () => {
  render(<PlanScreen />);
  expect(screen.queryByRole('group', { name: 'Player 1' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Players' }));
  expect(screen.getAllByRole('group', { name: /^Player \d/ })).toHaveLength(6);
  expect(within(screen.getByRole('group', { name: 'Player 1' })).getByText('My faction')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('group', { name: 'Player 1' })).toBeNull();
});
