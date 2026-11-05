import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
});

test('the counter shows taken parts, mine from the plan and others by tapping', async () => {
  render(<PlanScreen />);
  expect(within(widget()).getByText('0 of 6')).toBeVisible();
  await userEvent.click(part('Secret objective'));
  expect(game().expedition.slices.secret).toBe('other');
  expect(within(widget()).getByText('1 of 6')).toBeVisible();
  await userEvent.click(part('Secret objective'));
  expect(game().expedition.slices.secret ?? null).toBeNull();
  expect(within(widget()).getByText('0 of 6')).toBeVisible();

  useGame.getState().addEntry(1, { type: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }, 'action');
  expect(await within(widget()).findByText('1 of 6')).toBeVisible();
  // My own part comes from the plan, not from tapping.
  expect(part('3 trade goods')).toBeDisabled();
});

test('a part taken by another player cannot be chosen in the expedition entry', async () => {
  useGame.getState().setSlice('inf5', 'other');
  render(<PlanScreen />);
  const id = useGame.getState().addEntry(1, { type: 'expedition', sliceId: null, payment: { planets: [], tradeGoods: 0 } }, 'action');
  await userEvent.click(await screen.findByRole('button', { name: 'Expedition contribution' }));
  const editor = screen.getByRole('group', { name: 'Expedition part' });
  expect(within(editor).getByRole('button', { name: '5 influence' })).toBeDisabled();
  await userEvent.click(within(editor).getByRole('button', { name: '5 resources' }));
  const entry = plan().rounds[0].entries.find(e => e.id === id)!;
  expect(entry).toMatchObject({ type: 'expedition', sliceId: 'res5' });
});

test('after the sixth part the map marks suitable systems and Thunder\'s Edge can be placed', async () => {
  const { ok, bad } = slots();
  for (const id of SLICES.slice(0, 5)) useGame.getState().setSlice(id, 'other');
  render(<PlanScreen />);
  expect(document.querySelector('.tile-valid')).toBeNull();
  await userEvent.click(part('Technology'));
  expect(within(widget()).getByText('6 of 6')).toBeVisible();
  expect(tile(ok).classList.contains('tile-valid')).toBe(true);
  expect(tile(bad).classList.contains('tile-valid')).toBe(false);

  await userEvent.click(part('Choose system'));
  await userEvent.click(tile(bad));
  expect(game().expedition.thundersEdgeSystem).toBeNull();
  await userEvent.click(tile(ok));
  expect(game().expedition.thundersEdgeSystem).toBe(ok);
  expect(within(tile(ok) as HTMLElement).getByRole('group', { name: /Thunder's Edge/ })).toBeTruthy();
});

test('the Fracture button adds its systems beside the map', async () => {
  render(<PlanScreen />);
  const control = screen.getByRole('group', { name: 'Fracture' });
  expect(screen.queryByRole('group', { name: 'Fracture systems' })).toBeNull();
  await userEvent.click(within(control).getByRole('button', { name: 'Open the Fracture' }));
  expect(game().fracture.active).toBe(true);
  const group = screen.getByRole('group', { name: 'Fracture systems' });
  expect(group.querySelectorAll('[data-fracture-tile]').length).toBe(7);
  expect(within(group).getByRole('group', { name: /Styx/ })).toBeTruthy();
});

test('ingress markers are toggled by tapping in the marking mode and do not change the projection', async () => {
  const { ok } = slots();
  render(<PlanScreen />);
  const before = JSON.stringify(project(game(), plan(), 'forecast', pack));
  await userEvent.click(within(screen.getByRole('group', { name: 'Fracture' })).getByRole('button', { name: 'Mark ingress' }));
  await userEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([ok]);
  expect(within(tile(ok) as HTMLElement).getByRole('img', { name: 'Ingress token' })).toBeTruthy();
  expect(JSON.stringify(project(game(), plan(), 'forecast', pack))).toBe(before);
  fireEvent.click(tile(ok));
  expect(game().fracture.ingress).toEqual([]);
});

test('choosing a seat stores it and moves the Fracture group', async () => {
  render(<PlanScreen />);
  const control = screen.getByRole('group', { name: 'Fracture' });
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
