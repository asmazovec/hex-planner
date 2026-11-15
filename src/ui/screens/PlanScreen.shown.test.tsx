/**
 * One shown player for the whole plan screen: the switch pinned at the top of the plan panel, and everything that is
 * someone's follows it: the totals, the rows of the list, the new action, the strategy cards, the components, the big hex.
 */
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as edits from '../../testing/entries';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { opponentAt, viewerNow } from '../../testing/store';
import { PlanScreen } from './PlanScreen';
import { shownPlayerNow } from './plan/shownPlayer';

const pack = loadPack(['pok']);
const TARGET = '0,1';

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  localStorage.clear();
  document.elementFromPoint = () => null;
  useGame.getState().closeGame();
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'naalu' }, pack);
  useGame.getState().setFaction(opponentAt(0), 'sol');
  useGame.getState().setTile(TARGET, '25');
});

const saved = () => useGame.getState().saved!;
const turns = () => saved().plans[0].rounds[0].turns;
const sol = () => opponentAt(0);
const panel = () => document.querySelector<HTMLElement>('.plan-panel')!;
const pinned = () => panel().querySelector<HTMLElement>('.plan-pinned')!;
const whose = () => within(screen.getByRole('group', { name: 'Shown player' }));
const show = async (name: string) => userEvent.click(whose().getByRole('button', { name }));
const cell = (name: string) => within(within(pinned()).getByRole('group', { name: 'Totals, now and forecast' })).getByRole('group', { name });
const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;

test('the switch and the totals stand pinned at the top of the plan panel, above the list, and nowhere else', () => {
  render(<PlanScreen />);
  expect(pinned().parentElement).toBe(panel());
  expect(pinned().nextElementSibling).toHaveClass('plan-scroll');
  expect(within(pinned()).getByRole('group', { name: 'Shown player' })).toBeVisible();
  expect(screen.getAllByRole('group', { name: 'Totals, now and forecast' })).toHaveLength(1);
  expect(document.querySelector('.plan-header .summary-bar')).toBeNull();
  // One switch: the menu of a new action and the components have none of their own.
  expect(screen.queryByRole('group', { name: 'Whose action' })).toBeNull();
  expect(whose().getByRole('button', { name: 'Naalu' })).toHaveAttribute('aria-pressed', 'true');
  expect(whose().getAllByRole('button').map(b => b.textContent)).toEqual(['Naalu', 'Sol', 'Player 3', 'Player 4']);
});

test('the totals are those of the shown player', async () => {
  render(<PlanScreen />);
  // Maaluuk and Druaa give 3 resources and 3 influence, Jord 4 and 2.
  expect(cell('Resources')).toHaveTextContent(/^Resources3$/);
  await show('Sol');
  expect(whose().getByRole('button', { name: 'Sol' })).toHaveAttribute('aria-pressed', 'true');
  expect(cell('Resources')).toHaveTextContent(/^Resources4$/);
  expect(cell('Influence')).toHaveTextContent(/^Influence2$/);
});

test('a new action belongs to the shown player, a tactical one too', async () => {
  render(<PlanScreen />);
  await show('Sol');
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
  expect(turns().map(t => t.player)).toEqual([sol()]);
  await userEvent.click(screen.getByRole('button', { name: 'Done' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  await userEvent.click(tile(TARGET));
  expect(turns().map(t => [t.action.kind, t.player])).toEqual([['pass', sol()], ['tactical', sol()]]);
  // The token spent is Sol's: the totals of the panel are Sol's.
  expect(cell('Tactic')).toHaveTextContent('3 → 2');
  await show('Naalu');
  expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
});

test('the rows of the shown player stand at the first level, every other player\'s at the second, mine among them', async () => {
  edits.addEntry(1, { type: 'pass' }, 'action');
  edits.addEntry(1, { type: 'pass' }, 'action', sol());
  render(<PlanScreen />);
  const rows = () => [...document.querySelectorAll<HTMLElement>('.entry')].map(row => [row.getAttribute('aria-label'), row.classList.contains('entry-rival'), row.style.getPropertyValue('--owner')]);
  const colour = (id: string) => `var(--player-${saved().table.players.find(p => p.id === id)!.color})`;
  expect(rows()).toEqual([['Pass', false, ''], ['Sol: Pass', true, colour(sol())]]);
  await show('Sol');
  expect(rows()).toEqual([['Naalu: Pass', true, colour(viewerNow())], ['Pass', false, '']]);
});

test('the strategy cards are those of the shown player, kept for each player apart', async () => {
  render(<PlanScreen />);
  await show('Sol');
  const grid = () => within(document.querySelector<HTMLElement>('.card-grid')!);
  const leadership = () => grid().getByRole('button', { name: /Leadership/ });
  await userEvent.click(leadership());
  await userEvent.click(leadership());
  await userEvent.click(leadership());
  expect(saved().plans[0].rounds[0].picks[sol()]).toMatchObject({ strategyCard: 1 });
  expect(saved().plans[0].rounds[0].picks[viewerNow()]?.strategyCard ?? null).toBeNull();
  expect(leadership()).toHaveClass('card-main');
  await show('Naalu');
  expect(leadership()).not.toHaveClass('card-main');
  await show('Sol');
  expect(leadership()).toHaveClass('card-main');
});

test('the components drawer shows what the shown player holds, with no choice of its own', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: /^Components/ }));
  const sheet = () => within(screen.getByRole('dialog', { name: 'Components' }));
  expect(sheet().queryByRole('group', { name: 'Whose components' })).toBeNull();
  expect(sheet().getByText('Sarween Tools')).toBeVisible();
  expect(sheet().queryByText('Antimass Deflectors')).toBeNull();
  await show('Sol');
  expect(sheet().getByText('Antimass Deflectors')).toBeVisible();
  expect(sheet().queryByText('Sarween Tools')).toBeNull();
});

test('the big hex places the units of the shown player', async () => {
  render(<PlanScreen />);
  await show('Sol');
  await userEvent.click(tile(TARGET));
  const hex = within(screen.getByRole('dialog'));
  await userEvent.click(hex.getByRole('button', { name: 'Setup' }));
  // One switch: the hex has no choice of whose units these are.
  expect(hex.queryByRole('group', { name: 'Whose units' })).toBeNull();
  await userEvent.click(hex.getByRole('button', { name: 'Cruiser' }));
  expect(turns().map(t => [t.action.kind, t.player])).toEqual([['correction', sol()]]);
  // A second tap goes to the same record; my own tap in the same system makes one of mine.
  await userEvent.click(hex.getByRole('button', { name: 'Cruiser' }));
  expect(turns()).toHaveLength(1);
  act(() => useGame.getState().changeAdjustment(1, { kind: 'setup', systemId: TARGET, unit: 'cruiser', planetId: null, amount: 1 }, viewerNow()));
  expect(turns().map(t => t.player)).toEqual([sol(), viewerNow()]);
});

test('the status turn is added for the shown player, one for each', async () => {
  render(<PlanScreen />);
  /** The button of the status phase itself, not the row of a status turn. */
  const add = () => [...document.querySelectorAll<HTMLElement>('section.phase > button')].find(b => b.textContent === 'Tokens and points');
  await userEvent.click(add()!);
  expect(turns().map(t => [t.action.kind, t.player])).toEqual([['status', viewerNow()]]);
  expect(add()).toBeUndefined();
  await show('Sol');
  await userEvent.click(add()!);
  expect(turns().map(t => [t.action.kind, t.player])).toEqual([['status', viewerNow()], ['status', sol()]]);
  expect(add()).toBeUndefined();
});

test('the shown player is the one at the tablet again when another game opens', async () => {
  render(<PlanScreen />);
  await show('Sol');
  expect(shownPlayerNow(saved().table)).toBe(sol());
  cleanup();
  act(() => {
    useGame.getState().closeGame();
    useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'naalu' }, pack);
    useGame.getState().setFaction(opponentAt(0), 'sol');
  });
  expect(shownPlayerNow(saved().table)).toBe(viewerNow());
  render(<PlanScreen />);
  expect(whose().getByRole('button', { name: 'Naalu' })).toHaveAttribute('aria-pressed', 'true');
});

test('an action of another player opened for editing leaves the shown player as it was, and says whose it is', async () => {
  edits.addEntry(1, { type: 'pass' }, 'action', sol());
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit: Sol: Pass' }));
  expect(whose().getByRole('button', { name: 'Naalu' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Expected of The Federation of Sol')).toBeVisible();
});
