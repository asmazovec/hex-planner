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
const part = (name: string | RegExp) => within(widget()).getByRole('button', { name });
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
  await userEvent.click(teButton());
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

  act(() => { useGame.getState().addEntry(1, { type: 'pass', acts: [{ kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }] }, 'action'); });
  expect(await within(widget()).findByText('1 of 6')).toBeVisible();
  // My own part comes from the plan, not from tapping.
  expect(part('3 trade goods')).toBeDisabled();
});

test('a part taken by another player cannot be chosen in the expedition of a turn', async () => {
  useGame.getState().setSlice('inf5', 'other');
  render(<PlanScreen />);
  const id = useGame.getState().addEntry(1, { type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: null, payment: { planets: [], tradeGoods: 0 } }] }, 'action');
  await userEvent.click(await screen.findByRole('button', { name: 'Edit: Component action' }));
  await userEvent.click(within(screen.getByRole('group', { name: 'In this turn' })).getByRole('button', { name: /^\+ Expedition:/ }));
  const editor = screen.getByRole('group', { name: 'Expedition part' });
  expect(within(editor).getByRole('button', { name: '5 influence' })).toBeDisabled();
  await userEvent.click(within(editor).getByRole('button', { name: '5 resources' }));
  const entry = plan().rounds[0].entries.find(e => e.id === id)!;
  expect(entry).toMatchObject({ type: 'component', acts: [{ kind: 'expedition', sliceId: 'res5' }] });
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

  // Placing returns to the panel, where the card moves the system; the hint's button leaves the choice.
  expect(within(widget()).queryByRole('button', { name: 'Choose system' })).toBeNull();
  await userEvent.click(part(/^Thunder's Edge in system .*Tap to choose another system$/));
  expect(tile(ok).classList.contains('tile-valid')).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Back to the panel' }));
  expect(document.querySelector('.tile-valid')).toBeNull();
  expect(widget()).toBeVisible();

  // The cross inside the card removes it, and the choice comes back.
  await userEvent.click(part("Remove Thunder's Edge"));
  expect(game().expedition.thundersEdgeSystem).toBeNull();
  expect(part('Choose system')).toBeVisible();
});

test('the Fracture button adds its systems beside the map', async () => {
  await openPanel();
  const control = fracture();
  expect(screen.queryByRole('group', { name: 'Fracture systems' })).toBeNull();
  await userEvent.click(within(control).getByRole('button', { name: 'Open the Fracture' }));
  expect(game().fracture.active).toBe(true);
  const group = screen.getByRole('group', { name: 'Fracture systems' });
  expect(group.querySelectorAll('[data-fracture-tile]').length).toBe(7);
  expect(group).toHaveClass('fracture-opening');
  const middle = group.querySelectorAll<SVGGElement>('.fracture-fly')[3];
  expect(middle.style.animationDelay).toBe('0ms');
  expect(group.querySelectorAll<SVGGElement>('.fracture-fly')[0].style.animationDelay).toBe('165ms');
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

test('a change of round closes the panel, like the other panels', async () => {
  useGame.getState().addRound();
  await openPanel();
  expect(screen.getByRole('button', { name: /^Thunder's Edge · / })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Round 1' }));
  expect(screen.getByRole('button', { name: /^Thunder's Edge · / })).toHaveAttribute('aria-pressed', 'false');
});

test('the way back from choosing on the map stands outside the spoken hint', async () => {
  await openPanel();
  await userEvent.click(screen.getByRole('button', { name: 'Mark ingress' }));
  const back = document.querySelector('.map-hint button');
  expect(back).not.toBeNull();
  expect(back!.closest('[role="status"]')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent(/./);
});

test('ships fly to the Fracture: its systems take the taps of a tactical action, and the system is told by its planet', async () => {
  await openPanel();
  await userEvent.click(within(fracture()).getByRole('button', { name: 'Open the Fracture' }));
  const tiles = game().fracture.tiles!;
  const [slot, tileId] = Object.entries(tiles)[0];
  expect(tileId).toBe('fracture1');
  await userEvent.click(teButton());
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
  const group = screen.getByRole('group', { name: 'Fracture systems' });
  await userEvent.click(group.querySelector(`[data-slot="${slot}"]`)!);
  const entry = plan().rounds[0].entries.find(e => e.type === 'tactical');
  expect(entry).toMatchObject({ systemId: slot });
  expect(screen.getByText('Active system: Cocytus', { selector: 'strong' })).toBeVisible();
});

test('the Fracture\'s systems follow its seat and go when it closes', () => {
  act(() => useGame.getState().setFractureActive(true));
  const first = game().fracture.tiles!;
  expect(Object.values(first)).toHaveLength(7);
  act(() => useGame.getState().setFractureSeat(3));
  expect(game().fracture.tiles).not.toEqual(first);
  act(() => useGame.getState().setFractureActive(false));
  expect(game().fracture.tiles).toEqual({});
});

test('a Fracture already open does not play its opening again when the map comes back', () => {
  act(() => useGame.getState().setFractureActive(true));
  render(<PlanScreen />);
  expect(screen.getByRole('group', { name: 'Fracture systems' })).not.toHaveClass('fracture-opening');
});

test('moving the open Fracture to another seat plays its arrival again', () => {
  act(() => useGame.getState().setFractureActive(true));
  render(<PlanScreen />);
  const before = screen.getByRole('group', { name: 'Fracture systems' });
  expect(before).not.toHaveClass('fracture-opening');
  act(() => useGame.getState().setFractureSeat(3));
  const after = screen.getByRole('group', { name: 'Fracture systems' });
  expect(after).toHaveClass('fracture-opening');
  expect(after).not.toBe(before);
});

test('closing the Fracture fades it where it stands, and then it is gone', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  act(() => useGame.getState().setFractureActive(true));
  render(<PlanScreen />);
  act(() => useGame.getState().setFractureActive(false));
  expect(screen.queryByRole('group', { name: 'Fracture systems' })).toBeNull();
  const group = document.querySelector('.fracture-closing')!;
  expect(group.querySelectorAll('[data-fracture-tile]')).toHaveLength(7);
  fireEvent.animationEnd(group);
  fireEvent(group, new Event('webkitAnimationEnd', { bubbles: true }));
  expect(document.querySelector('.fracture-closing')).toBeNull();
  vi.unstubAllGlobals();
});

test('moving the Fracture fades it where it stood while it arrives at the new seat', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  act(() => useGame.getState().setFractureActive(true));
  render(<PlanScreen />);
  act(() => useGame.getState().setFractureSeat(3));
  expect(document.querySelector('.fracture-closing')).not.toBeNull();
  expect(screen.getByRole('group', { name: 'Fracture systems' })).toHaveClass('fracture-opening');
  vi.unstubAllGlobals();
});
