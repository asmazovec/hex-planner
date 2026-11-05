import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { project } from '../../domain/project';
import { validThundersEdgeSystem } from '../../domain/thundersEdge';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';

const pack = loadPack(['pok', 'te']);
const SLICES = EXPEDITION_SLICES.map(s => s.id);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'arborec' }, pack);
});

const game = () => useGame.getState().game!;
const plan = () => game().plans.find(p => p.id === game().activePlanId)!;
const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;
const widget = () => screen.getByRole('group', { name: 'Expedition' });
const part = (name: string) => within(widget()).getByRole('button', { name });
const fracture = () => screen.getByRole('group', { name: 'Fracture' });
const teButton = () => screen.getByRole('button', { name: /^Thunder's Edge · / });

/** The screen with the Thunder's Edge panel open. */
async function openPanel() {
  render(<PlanScreen />);
  await userEvent.click(teButton());
}

/** Puts an empty deep-space tile and a planet tile on the map; returns their slots. */
function slots() {
  const empty = Object.values(pack.tiles).find(t => validThundersEdgeSystem(t) && t.anomaly === undefined)!;
  useGame.getState().setTile('0,1', empty.id);
  useGame.getState().setTile('1,0', '25');
  return { ok: '0,1', bad: '1,0' };
}

test('the widgets are hidden without Thunder\'s Edge', () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, loadPack(['pok']));
  render(<PlanScreen />);
  expect(screen.queryByRole('group', { name: 'Expedition' })).toBeNull();
  expect(screen.queryByRole('group', { name: 'Fracture' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Thunder's Edge/ })).toBeNull();
});

test('the widgets live in a panel the map tools open and close, and are not in the plan', async () => {
  render(<PlanScreen />);
  expect(screen.queryByRole('group', { name: 'Expedition' })).toBeNull();
  expect(screen.queryByRole('group', { name: 'Fracture' })).toBeNull();
  await userEvent.click(teButton());
  const panel = screen.getByRole('dialog', { name: "Thunder's Edge" });
  expect(within(panel).getByRole('group', { name: 'Expedition' })).toBeVisible();
  expect(within(panel).getByRole('group', { name: 'Fracture' })).toHaveTextContent('Not an action');
  await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: "Thunder's Edge" })).toBeNull();
});

test('this panel and the upgrades panel replace each other', async () => {
  await openPanel();
  await userEvent.click(screen.getByRole('button', { name: 'Ship upgrades' }));
  expect(screen.queryByRole('dialog', { name: "Thunder's Edge" })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Ship upgrades' })).toBeVisible();
  await userEvent.click(teButton());
  expect(screen.getByRole('dialog', { name: "Thunder's Edge" })).toBeVisible();
  expect(screen.queryByRole('dialog', { name: 'Ship upgrades' })).toBeNull();
});

test('the button shows the expedition count, asks for the system at six, then shows the system', async () => {
  const { ok } = slots();
  render(<PlanScreen />);
  expect(teButton()).toHaveTextContent("Thunder's Edge · 0/6");
  expect(teButton()).not.toHaveClass('te-ready');
  act(() => { for (const id of SLICES.slice(0, 3)) useGame.getState().setSlice(id, 'other'); });
  expect(teButton()).toHaveTextContent("Thunder's Edge · 3/6");
  act(() => { for (const id of SLICES) useGame.getState().setSlice(id, 'other'); });
  expect(teButton()).toHaveTextContent("Thunder's Edge · 6/6");
  expect(teButton()).toHaveClass('te-ready');
  act(() => useGame.getState().setThundersEdge(ok));
  expect(teButton()).toHaveTextContent(`Thunder's Edge · #${pack.tiles[game().map[ok]].number}`);
  expect(teButton()).not.toHaveClass('te-ready');
});

test('the counter shows taken parts, mine from the plan and others by tapping', async () => {
  await openPanel();
  expect(within(widget()).getByText('0 of 6')).toBeVisible();
  await userEvent.click(part('Secret objective'));
  expect(game().expedition.slices.secret).toBe('other');
  expect(within(widget()).getByText('1 of 6')).toBeVisible();
  await userEvent.click(part('Secret objective'));
  expect(game().expedition.slices.secret ?? null).toBeNull();
  expect(within(widget()).getByText('0 of 6')).toBeVisible();

  act(() => { useGame.getState().addEntry(1, { type: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }, 'action'); });
  expect(await within(widget()).findByText('1 of 6')).toBeVisible();
  // My own part comes from the plan, not from tapping.
  expect(part('3 trade goods')).toBeDisabled();
});

test('a part taken by another player cannot be chosen in the expedition entry', async () => {
  useGame.getState().setSlice('inf5', 'other');
  render(<PlanScreen />);
  const id = useGame.getState().addEntry(1, { type: 'expedition', sliceId: null, payment: { planets: [], tradeGoods: 0 } }, 'action');
  await userEvent.click(await screen.findByRole('button', { name: 'Expedition contribution, end of turn' }));
  const editor = screen.getByRole('group', { name: 'Expedition part' });
  expect(within(editor).getByRole('button', { name: '5 influence' })).toBeDisabled();
  await userEvent.click(within(editor).getByRole('button', { name: '5 resources' }));
  const entry = plan().rounds[0].entries.find(e => e.id === id)!;
  expect(entry).toMatchObject({ type: 'expedition', sliceId: 'res5' });
});

test('suitable systems light up only while choosing, and Thunder\'s Edge can be placed', async () => {
  const { ok, bad } = slots();
  for (const id of SLICES.slice(0, 5)) useGame.getState().setSlice(id, 'other');
  await openPanel();
  expect(document.querySelector('.tile-valid')).toBeNull();
  await userEvent.click(part('Technology'));
  expect(within(widget()).getByText('6 of 6')).toBeVisible();
  expect(document.querySelector('.tile-valid')).toBeNull();

  await userEvent.click(part('Choose system'));
  // The panel steps aside so the whole map can be tapped.
  expect(screen.queryByRole('dialog', { name: "Thunder's Edge" })).toBeNull();
  expect(tile(ok).classList.contains('tile-valid')).toBe(true);
  expect(tile(bad).classList.contains('tile-valid')).toBe(false);
  await userEvent.click(tile(bad));
  expect(game().expedition.thundersEdgeSystem).toBeNull();
  await userEvent.click(tile(ok));
  expect(game().expedition.thundersEdgeSystem).toBe(ok);
  expect(within(tile(ok) as HTMLElement).getByRole('group', { name: /Thunder's Edge/ })).toBeTruthy();
  expect(document.querySelector('.tile-valid')).toBeNull();

  // Placing returns to the panel, where the system can be moved; the hint's button leaves the choice.
  await userEvent.click(part('Choose system'));
  expect(tile(ok).classList.contains('tile-valid')).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Back to the panel' }));
  expect(document.querySelector('.tile-valid')).toBeNull();
  expect(widget()).toBeVisible();
});

test('the Fracture button adds its systems beside the map', async () => {
  await openPanel();
  const control = fracture();
  expect(screen.queryByRole('group', { name: 'Fracture systems' })).toBeNull();
  await userEvent.click(within(control).getByRole('button', { name: 'Open the Fracture' }));
  expect(game().fracture.active).toBe(true);
  const group = screen.getByRole('group', { name: 'Fracture systems' });
  expect(group.querySelectorAll('[data-fracture-tile]').length).toBe(7);
  expect(within(group).getByRole('group', { name: /Styx/ })).toBeTruthy();
});

test('ingress markers are toggled by tapping in the marking mode and do not change the projection', async () => {
  const { ok } = slots();
  await openPanel();
  const before = JSON.stringify(project(game(), plan(), 'forecast', pack));
  await userEvent.click(within(fracture()).getByRole('button', { name: 'Mark ingress' }));
  await userEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([ok]);
  expect(within(tile(ok) as HTMLElement).getByRole('img', { name: 'Ingress token' })).toBeTruthy();
  expect(JSON.stringify(project(game(), plan(), 'forecast', pack))).toBe(before);
  fireEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([]);
});

test('choosing a seat stores it and moves the Fracture group', async () => {
  await openPanel();
  const control = fracture();
  await userEvent.click(within(control).getByRole('button', { name: 'Open the Fracture' }));
  const where = () => {
    const rect = document.querySelector('[data-fracture-tile]')!.getAttribute('transform');
    return rect;
  };
  const before = where();
  const seats = within(within(control).getByRole('group', { name: 'Seat' })).getAllByRole('button');
  expect(seats).toHaveLength(6);
  await userEvent.click(seats[3]);
  expect(game().fracture.seat).toBe(4);
  expect(where()).not.toBe(before);
  const atFour = where();
  await userEvent.click(seats[0]);
  expect(game().fracture.seat).toBe(1);
  expect(where()).not.toBe(atFour);
});

test('marking mode ends when a tactical action is chosen, so the next tap does not toggle a token', async () => {
  const { ok } = slots();
  await openPanel();
  await userEvent.click(within(fracture()).getByRole('button', { name: 'Mark ingress' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  await userEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([]);
  // The panel does not come back over the map during the action.
  expect(screen.queryByRole('dialog', { name: "Thunder's Edge" })).toBeNull();
});

test('marking keeps the panel away for many taps; the tools button brings it back and ends the marking', async () => {
  const { ok } = slots();
  await openPanel();
  await userEvent.click(within(fracture()).getByRole('button', { name: 'Mark ingress' }));
  expect(screen.queryByRole('dialog', { name: "Thunder's Edge" })).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Tap systems');
  await userEvent.click(teButton());
  expect(screen.getByRole('dialog', { name: "Thunder's Edge" })).toBeVisible();
  fireEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([]);
});
