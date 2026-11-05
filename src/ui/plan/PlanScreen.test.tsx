import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
}));

import { loadPack } from '../../data/loadPack';
import type { Entry } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { App } from '../App';
import { PlanScreen } from '../screens/PlanScreen';
import type { Move } from './tactical';

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
  useGame.getState().setTile('1,1', '39');
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
  expect(screen.getByRole('dialog', { name: 'Tile 25' })).toBeVisible();
});

const WAY = '1,1';
const hoverPath = (slot: string) => { document.elementFromPoint = () => tile(slot); };

async function addRouteByTaps(...slots: string[]) {
  for (const slot of slots) await userEvent.click(tile(slot));
}

test('a route by taps: source, hexes in order, the active system; nothing is chosen at first', async () => {
  await chooseSystem();
  await userEvent.click(tile(HOME));
  expect(tactical().moves).toEqual([]);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
  await addRouteByTaps(WAY, TARGET);
  expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
  expect(screen.getByText('Flight 5 → 25')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Fly' })).toBeDisabled();
  expect(document.querySelector('.route')).toBeInTheDocument();
  expect(tile(WAY)).toHaveClass('tile-path');
  expect(tile(HOME)).toHaveClass('tile-source');
});

test('a tap on the last hex removes it, and on the source alone gives up', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, WAY, WAY, TARGET);
  expect(tactical().moves).toEqual([{ from: HOME, units: {} }]);
  useGame.getState().updateEntry(tactical().id, { moves: [] });
  await addRouteByTaps(HOME, HOME);
  expect(screen.queryByRole('status')).toBeNull();
  await addRouteByTaps(HOME);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
});

test('a straight arrow needs only the source and the active system, and keeps no way', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  expect(tactical().moves).toEqual([{ from: HOME, units: {} }]);
});

test('every arrow adds a source and keeps the earlier ones, also a source with no ships', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await addRouteByTaps(WAY, TARGET);
  expect(tactical().moves.map(m => m.from)).toEqual([HOME, WAY]);
  expect(document.querySelectorAll('.route-line')).toHaveLength(2);
  // The picker of an empty source offers everything: choosing ahead warns and blocks nothing.
  await userEvent.click(screen.getByRole('button', { name: 'Take one Dreadnought' }));
  expect(tactical().moves[1]).toEqual({ from: WAY, units: { dreadnought: 1 } });
  expect(within(screen.getByRole('list', { name: 'Warnings' })).getAllByRole('listitem').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Fly' })).toBeEnabled();
});

test('each source is listed with its units and can be removed', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
  const source = screen.getByRole('button', { name: /^5/ });
  expect(source).toHaveTextContent('Carrier 1');
  await userEvent.click(screen.getByRole('button', { name: 'Remove source 5' }));
  expect(tactical().moves).toEqual([]);
  expect(document.querySelector('.route-line')).toBeNull();
});

test('a source with nothing chosen goes when the editor closes', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await addRouteByTaps(WAY, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
  await userEvent.click(screen.getByRole('button', { name: /^5/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(tactical().moves).toEqual([{ from: HOME, units: { carrier: 1 } }]);
});

test('a tap on the active system with no routes takes the action back: token returned, choosing again, one undo step', async () => {
  await chooseSystem();
  expect(screen.getByText('Active system: 25')).toBeVisible();
  expect(screen.getByText('Wrong system? Tap it again.')).toBeVisible();
  await userEvent.click(tile(TARGET));
  expect(entries()).toHaveLength(0);
  expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the system');
  await userEvent.click(tile(HOME));
  expect(tactical().systemId).toBe(HOME);
  await userEvent.click(screen.getByRole('button', { name: 'Done editing' }));
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(entries()).toHaveLength(0);
});

test('with a route a tap on the active system cancels nothing', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(tile(TARGET));
  expect(entries()).toHaveLength(1);
  expect(screen.queryByText('Wrong system? Tap it again.')).toBeNull();
});

test('a drag through hexes records the way, and pulling it back removes the step', async () => {
  await chooseSystem();
  fireEvent.pointerDown(tile(HOME), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  hoverPath(WAY);
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 2, clientY: 2 });
  expect(tile(WAY)).toHaveClass('tile-path');
  hoverPath('2,0');
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 3, clientY: 3 });
  hoverPath(WAY);
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 2, clientY: 2 });
  hoverPath(TARGET);
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
});

test('an arrow drag opens the same picker, in both directions', async () => {
  await chooseSystem();
  document.elementFromPoint = () => tile(TARGET);
  fireEvent.pointerDown(tile(HOME), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves.map(m => m.from)).toEqual([HOME]);
  expect(screen.getByRole('button', { name: 'Close picker' })).toBeVisible();

  useGame.getState().updateEntry(tactical().id, { moves: [] });
  document.elementFromPoint = () => tile(HOME);
  fireEvent.pointerDown(tile(TARGET), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(tactical().moves.map(m => m.from)).toEqual([HOME]);
});

test('outside the editor a tile tap opens the big hex and drags do nothing', async () => {
  render(<PlanScreen />);
  document.elementFromPoint = () => tile(TARGET);
  fireEvent.pointerDown(tile(HOME), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 5, clientY: 5 });
  expect(entries()).toHaveLength(0);
  await userEvent.click(tile(TARGET));
  expect(screen.getByRole('dialog', { name: 'Tile 25' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('landing puts ground units on a planet and changes its control', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
  const planet = screen.getByRole('group', { name: 'Landing on Quann' });
  await userEvent.click(within(planet).getByRole('button', { name: 'Add one Infantry' }));
  expect(tactical().landings).toEqual([{ planetId: 'quann', units: { infantry: 1 } }]);
  expect(within(tile(TARGET) as HTMLElement).getByRole('group', { name: /Quann: .*yours/ })).toBeInTheDocument();
});

test('landing is hidden in a system without planets', async () => {
  useGame.getState().setTile(TARGET, '39');
  await chooseSystem();
  expect(screen.queryByText('Landing (optional)')).toBeNull();
  expect(screen.queryByText(/No planets/)).toBeNull();
});

test('landing is hidden while no ground units are in the system', async () => {
  await chooseSystem();
  expect(screen.queryByText('Landing (optional)')).toBeNull();
});

test('landing shows counts of what arrived and what is assigned; no stepper for a unit that is absent', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
  expect(screen.getByText('Landing (optional)')).toBeVisible();
  expect(screen.getByText('Infantry: 2, assigned 0')).toBeVisible();
  const planet = screen.getByRole('group', { name: 'Landing on Quann' });
  expect(within(planet).queryByRole('group', { name: 'Mech' })).toBeNull();
  await userEvent.click(within(planet).getByRole('button', { name: 'Add one Infantry' }));
  expect(screen.getByText('Infantry: 2, assigned 1')).toBeVisible();
});

test('a landing whose units are gone stays visible, can go over the limit, and warns', async () => {
  await chooseSystem();
  act(() => useGame.getState().updateEntry(tactical().id, { landings: [{ planetId: 'quann', units: { infantry: 1 } }] }));
  expect(screen.getByText('Landing (optional)')).toBeVisible();
  expect(screen.getByText('Infantry: 0, assigned 1')).toBeVisible();
  const planet = screen.getByRole('group', { name: 'Landing on Quann' });
  await userEvent.click(within(planet).getByRole('button', { name: 'Add one Infantry' }));
  expect(tactical().landings).toEqual([{ planetId: 'quann', units: { infantry: 2 } }]);
  expect(screen.getByText('Landing needs 2 × Infantry, but only 0 arrived.')).toBeVisible();
});

test('a tap on an empty slot opens nothing', async () => {
  render(<PlanScreen />);
  await userEvent.click(tile('0,-3'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('during a tactical action a tile tap opens no big hex', async () => {
  await chooseSystem();
  await userEvent.click(tile(HOME));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('production without a dock warns and still works', async () => {
  await chooseSystem();
  expect(screen.getByText('No space dock in this system.')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Open the shop' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' }));
  expect(tactical().production).toEqual({ cruiser: 1 });
});

test('a merged entry names its system and opens the big hex in its own mode', async () => {
  useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: TARGET, units: { carrier: 1 } } } }, 'strategy');
  useGame.getState().changeAdjustment(1, { kind: 'losses', systemId: TARGET, unit: 'carrier', planetId: null, amount: -1 });
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit: Losses · 25' }));
  expect(screen.getByRole('button', { name: 'Battle' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Give back Carrier' })).toBeVisible();
});

test('units placed on the big hex reach the map, also when it shows the present', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Now' }));
  await userEvent.click(tile(TARGET));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: 'Cruiser ×1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(within(tile(TARGET) as HTMLElement).queryByRole('img', { name: 'Cruiser ×1' })).toBeNull();
});

test('production picks the payment by itself and warns about the shortfall; manual choice stops the auto pick', async () => {
  await chooseSystem(HOME);
  const shop = async (name: string | RegExp) => {
    await userEvent.click(screen.getByRole('button', { name: 'Open the shop' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  };
  await shop('Cruiser');
  expect(tactical().production).toEqual({ cruiser: 1 });
  expect(tactical().payment).toEqual({ planets: ['nestphar'], tradeGoods: 0 });
  expect(screen.getByText(/Cost 2/)).toBeVisible();
  expect(screen.queryByText(/short by/)).toBeNull();
  await shop('Cruiser');
  expect(screen.getByText(/short by 1/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
  await userEvent.click(screen.getByRole('button', { name: /Nestphar/ }));
  expect(tactical().payment.planets).toEqual([]);
  await shop(/^Cruiser ×/);
  expect(tactical().production).toEqual({ cruiser: 1 });
  expect(tactical().payment.planets).toEqual([]);
  await userEvent.click(screen.getByRole('button', { name: 'Pick automatically' }));
  expect(tactical().payment.planets).toEqual(['nestphar']);
});

test('warnings come only from the projection', async () => {
  await chooseSystem();
  expect(screen.queryByRole('list', { name: 'Warnings' })).toBeNull();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  expect(within(screen.getByRole('list', { name: 'Warnings' })).getAllByRole('listitem').length).toBeGreaterThan(0);
  expect(document.querySelector('.route.arrow-warn')).toBeInTheDocument();
});

test('Done returns to the plan, and the pencil reopens the editor', async () => {
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /^Edit: Tactical action · 25/ }));
  expect(screen.getByRole('button', { name: 'Done editing' })).toBeVisible();
});

describe('reading the plan', () => {
  const plannedRoute = () => useGame.getState().addEntry(1, {
    type: 'tactical', systemId: TARGET, landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
    moves: [{ from: HOME, units: { carrier: 1, infantry: 1 }, via: [WAY] }, { from: WAY, units: { fighter: 1 }, pickupOf: HOME }],
  }, 'action');
  const rowOf = (name: RegExp | string) => within(screen.getByRole('listitem', { name }));
  const label = /^Tactical action · 25/;

  test('a tap shows numbered steps with no editor, a second tap closes them', async () => {
    plannedRoute();
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.queryByRole('button', { name: 'Done editing' })).toBeNull();
    const row = rowOf(label);
    expect(row.getByText('Activate 25')).toBeVisible();
    expect(row.getByText('Fly 5 → 39 → 25', { exact: false })).toBeVisible();
    expect(row.getByText(/Pick up on the way in/)).toBeVisible();
    expect(row.getByText('Cargo 1 of 4', { exact: false })).toBeVisible();
    expect(tile(TARGET)).toHaveClass('tile-active');
    expect(tile(HOME)).toHaveClass('tile-source');
    expect(document.querySelector('.route.route-active')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.queryByText('Activate 25')).toBeNull();
    expect(tile(TARGET)).not.toHaveClass('tile-active');
    expect(document.querySelector('.route.route-active')).toBeNull();
  });

  test('Whole map closes it, and an entry with no system has no such button', async () => {
    plannedRoute();
    useGame.getState().addEntry(1, { type: 'component', note: 'Plague' }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await userEvent.click(screen.getByRole('button', { name: 'Whole map' }));
    expect(screen.queryByText('Activate 25')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Component action/ }));
    expect(screen.getByText('Plague')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
  });

  test('starting another action closes it', async () => {
    plannedRoute();
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
    expect(tile(TARGET)).not.toHaveClass('tile-active');
  });

  test('every entry type has a pencil and read-only steps; pass only its label', async () => {
    const add = useGame.getState().addEntry;
    add(1, { type: 'component', note: 'Plague' }, 'action');
    add(1, { type: 'expedition', sliceId: 'res5', payment: { planets: ['nestphar'], tradeGoods: 0 } }, 'action');
    add(1, { type: 'adjustment', label: 'Card', delta: { tradeGoods: 2 } }, 'action');
    add(1, { type: 'strategic', card: 8, effects: { mecatol: true } }, 'action');
    add(1, { type: 'secondary', card: 7, upgrades: ['carrier'] }, 'action');
    add(1, { type: 'pass' }, 'action');
    add(1, { type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0, vp: 2 }, 'status');
    render(<PlanScreen />);
    const read = async (row: RegExp, text: RegExp) => {
      await userEvent.click(rowOf(row).getByRole('button', { name: row }));
      expect(rowOf(row).getByText(text)).toBeVisible();
      expect(rowOf(row).getByRole('button', { name: /^Edit: / })).toBeVisible();
      expect(rowOf(row).queryByRole('textbox')).toBeNull();
    };
    await read(/^Component action/, /^Plague$/);
    await read(/^Expedition/, /5 resources/);
    await read(/^Manual adjustment/, /Trade goods \+2/);
    await read(/^Strategy: Imperial/, /Mecatol Rex under control/);
    await read(/^Secondary: Technology/, /Costs 1 strategy token/);
    await read(/^Tokens and points/, /tactic 1, fleet 1, strategy 0/);
    await userEvent.click(rowOf('Pass').getByRole('button', { name: 'Pass' }));
    expect(rowOf('Pass').queryByRole('button', { name: /^Edit/ })).toBeNull();
    expect(screen.getByRole('listitem', { name: 'Pass' })).not.toHaveClass('entry-shown');
  });

  test('the pencil opens the editor and closes the reading', async () => {
    plannedRoute();
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Tactical action/ }));
    expect(screen.getByRole('button', { name: 'Done editing' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
  });

  test('the flight repeats while shown and stops on closing; under reduced motion there is none', async () => {
    plannedRoute();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<PlanScreen />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(document.querySelector('.flight-layer')).toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(document.querySelector('.flight-layer')).toBeInTheDocument();
    // What flies has left its tile while the flight runs; the cargo on the way stays until the leader passes.
    expect(within(tile(HOME) as HTMLElement).queryByRole('img', { name: /Carrier/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(document.querySelector('.flight-layer')).toBeNull();
    vi.useRealTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    await act(async () => { await new Promise(r => setTimeout(r, 450)); });
    expect(document.querySelector('.flight-layer')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('leaving', () => {
  const tacticalBody = (moves: Move[]) => ({ type: 'tactical' as const, systemId: TARGET, moves, landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } });
  const startedRoute = async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
  };

  test('a tile tap opens the stage and closes the reading', async () => {
    useGame.getState().addEntry(1, tacticalBody([{ from: HOME, units: { carrier: 1 } }]), 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Tactical action · 25/ }));
    expect(screen.getByRole('button', { name: 'Whole map' })).toBeVisible();
    await userEvent.click(tile(WAY));
    expect(screen.getByRole('dialog', { name: 'Tile 39' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
    expect(screen.queryByText('Activate 25')).toBeNull();
  });

  test('a change of round during the reading closes it and clears the highlight', async () => {
    useGame.getState().addEntry(1, tacticalBody([{ from: HOME, units: { carrier: 1 } }]), 'action');
    useGame.getState().addRound();
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Round 1' }));
    await userEvent.click(screen.getByRole('button', { name: /^Tactical action · 25/ }));
    expect(tile(TARGET)).toHaveClass('tile-active');
    await userEvent.click(screen.getByRole('button', { name: 'Round 2' }));
    expect(tile(TARGET)).not.toHaveClass('tile-active');
    await userEvent.click(screen.getByRole('button', { name: 'Round 1' }));
    expect(screen.queryByText('Activate 25')).toBeNull();
    expect(document.querySelector('.route.route-active')).toBeNull();
  });

  test('a change of plan during the reading closes it', async () => {
    useGame.getState().addEntry(1, tacticalBody([{ from: HOME, units: { carrier: 1 } }]), 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Tactical action · 25/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.queryByText('Activate 25')).toBeNull();
    expect(tile(TARGET)).not.toHaveClass('tile-active');
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
  });

  test('undo during a tap route leaves no stale draft', async () => {
    useGame.getState().addEntry(1, tacticalBody([{ from: HOME, units: { carrier: 1 } }]), 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    await userEvent.click(tile(WAY));
    await userEvent.click(tile(HOME));
    expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    await userEvent.click(tile(WAY));
    expect(tile(HOME)).not.toHaveClass('tile-path');
    await userEvent.click(tile(HOME));
    // The tap starts a new route rather than continuing or undoing the old one.
    expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
    expect(tile(HOME)).toHaveClass('tile-path');
  });

  test('a change of plan drops an empty source from the plan it was made in', async () => {
    await startedRoute();
    const [id, first] = [tactical().id, plan().id];
    act(() => {
      useGame.getState().renamePlan('First');
      useGame.setState(s => ({ game: { ...s.game!, plans: [...s.game!.plans, { id: 'other', name: 'Other', rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [] }] }] } }));
    });
    await userEvent.click(screen.getByRole('tab', { name: 'Other' }));
    expect(plan().id).toBe('other');
    const inFirst = game().plans.find(p => p.id === first)!.rounds[0].entries.find(e => e.id === id) as Extract<Entry, { type: 'tactical' }>;
    expect(inFirst.moves).toEqual([]);
  });

  test('a copy of the plan does not inherit an empty source', async () => {
    await startedRoute();
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(game().plans).toHaveLength(2);
    for (const each of game().plans) {
      const moved = each.rounds[0].entries.find(e => e.type === 'tactical') as Extract<Entry, { type: 'tactical' }>;
      expect(moved.moves).toEqual([]);
    }
  });

  test('leaving the screen drops an empty source and keeps a chosen one', async () => {
    await startedRoute();
    await addRouteByTaps(WAY, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Close picker' }));
    await userEvent.click(screen.getByRole('button', { name: /^5/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
    cleanup();
    expect(tactical().moves).toEqual([{ from: HOME, units: { carrier: 1 } }]);
  });

  test('leaving through the app menu drops an empty source', async () => {
    useGame.getState().setTile(TARGET, '25');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Plan & map' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    await addRouteByTaps(TARGET, HOME, TARGET);
    expect(tactical().moves).toEqual([{ from: HOME, units: {} }]);
    await userEvent.click(screen.getByRole('button', { name: 'Game' }));
    expect(tactical().moves).toEqual([]);
  });

  test('marking an action done in Now shows no earlier planned move during its flight', async () => {
    const add = useGame.getState().addEntry;
    add(1, { type: 'adjustment', label: '', delta: { units: { systemId: WAY, units: { cruiser: 1 } } } }, 'strategy');
    useGame.getState().setEntryStatus(entries()[0].id, 'done');
    add(1, tacticalBody([{ from: HOME, units: { carrier: 1 } }]), 'action');
    const later = add(1, tacticalBody([{ from: WAY, units: { cruiser: 1 } }]), 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Now' }));
    const row = document.querySelector<HTMLElement>(`[data-entry-id="${later}"]`)!;
    await userEvent.click(within(row).getByRole('checkbox', { name: 'Done' }));
    expect(document.querySelector('.flight-layer')).toBeInTheDocument();
    expect(within(tile(HOME) as HTMLElement).getByRole('img', { name: /Carrier/ })).toBeInTheDocument();
    expect(within(tile(TARGET) as HTMLElement).queryByRole('img', { name: /Carrier/ })).toBeNull();
    expect(document.querySelector('[data-flight-stack="cruiser"]')).toBeInTheDocument();
  });
});

describe('playing the round', () => {
  const body = (from: string, unit: string) => ({ type: 'tactical' as const, systemId: TARGET, moves: [{ from, units: { [unit]: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } });
  const after = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  const pressMap = () => {
    fireEvent.pointerDown(tile(WAY), { pointerId: 9 });
    fireEvent.pointerUp(window, { pointerId: 9 });
  };
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const seed = () => {
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: WAY, units: { cruiser: 1 } } } }, 'strategy');
    const first = useGame.getState().addEntry(1, body(HOME, 'carrier'), 'action');
    const between = useGame.getState().addEntry(1, { type: 'pass' }, 'action');
    const last = useGame.getState().addEntry(1, body(WAY, 'cruiser'), 'action');
    return { setup: entries()[0].id, first, between, last };
  };
  const playingRow = () => document.querySelector('.entry-playing')?.getAttribute('data-entry-id');
  const play = () => screen.getByRole('button', { name: 'Play' });

  test('the button stands beside the add button and waits for entries', () => {
    render(<PlanScreen />);
    expect(play().closest('.phase-add')).toBe(screen.getByRole('button', { name: 'Add action' }).closest('.phase-add'));
    expect(play()).toBeDisabled();
    cleanup();
    useGame.getState().addEntry(1, { type: 'pass' }, 'action');
    render(<PlanScreen />);
    expect(play()).toBeEnabled();
  });

  test('all entries in order: flights with the playing highlight, pauses for the rest, then the map as it was and the plan unchanged', () => {
    const ids = seed();
    const planBefore = structuredClone(plan());
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<PlanScreen />);
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: /Carrier/ })).toBeInTheDocument();
    fireEvent.click(play());
    // The map goes back to before the first entry.
    expect(playingRow()).toBe(ids.setup);
    expect(within(tile(TARGET) as HTMLElement).queryByRole('img', { name: /Carrier/ })).toBeNull();
    after(260);
    expect(document.querySelector('.flight-layer')).toBeNull();
    after(450);
    after(260);
    expect(playingRow()).toBe(ids.first);
    expect(document.querySelector('[data-flight-stack="carrier"]')).toBeInTheDocument();
    expect(tile(TARGET)).toHaveClass('tile-active');
    expect(tile(HOME)).toHaveClass('tile-source');
    expect(document.querySelector('.route.route-active')).toBeInTheDocument();
    // A tap finishes the flight; the carrier is there for the next step.
    pressMap();
    expect(document.querySelector('.flight-layer')).toBeNull();
    expect(playingRow()).toBe(ids.between);
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: /Carrier/ })).toBeInTheDocument();
    after(260);
    expect(document.querySelector('.flight-layer')).toBeNull();
    after(450);
    expect(playingRow()).toBe(ids.last);
    after(260);
    expect(document.querySelector('[data-flight-stack="cruiser"]')).toBeInTheDocument();
    pressMap();
    expect(playingRow()).toBeUndefined();
    expect(tile(TARGET)).not.toHaveClass('tile-active');
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: /Cruiser/ })).toBeInTheDocument();
    expect(plan()).toEqual(planBefore);
  });

  test('it closes a reading, and a second tap stops it', async () => {
    seed();
    render(<PlanScreen />);
    await userEvent.click(screen.getAllByRole('button', { name: /^Tactical action · 25/ })[0]);
    expect(document.querySelector('.entry-shown')).toBeInTheDocument();
    await userEvent.click(play());
    expect(document.querySelector('.entry-shown')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
    expect(playingRow()).toBeTruthy();
    await userEvent.click(play());
    expect(playingRow()).toBeUndefined();
  });

  test('under reduced motion nothing flies, and the steps still pass', () => {
    const ids = seed();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<PlanScreen />);
    fireEvent.click(play());
    const step = () => { after(260); after(450); };
    step();
    expect(playingRow()).toBe(ids.first);
    after(260);
    expect(document.querySelector('.flight-layer')).toBeNull();
    after(450);
    expect(playingRow()).toBe(ids.between);
    step();
    step();
    expect(playingRow()).toBeUndefined();
  });

  test('a change to the plan ends it', () => {
    seed();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<PlanScreen />);
    fireEvent.click(play());
    expect(playingRow()).toBeTruthy();
    act(() => useGame.getState().addEntry(1, { type: 'pass' }, 'action'));
    expect(playingRow()).toBeUndefined();
  });
});

describe('flying', () => {
  test('Fly plays the action and a press on the map finishes it, without acting as a tap', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fly' }));
    expect(document.querySelector('.flight-layer')).toBeInTheDocument();
    expect(document.querySelector('[data-flight-stack="carrier"]')).toBeInTheDocument();
    await userEvent.click(tile(WAY));
    expect(document.querySelector('.flight-layer')).toBeNull();
    // That tap started no route.
    expect(screen.queryByRole('status')).toBeNull();
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: 'Carrier ×1' })).toBeInTheDocument();
  });

  test('marking an action with moves as done plays it; undo plays nothing', async () => {
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: { carrier: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Done' }));
    expect(document.querySelector('.flight-layer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.querySelector('.flight-layer')).toBeNull();
  });

  test('the number of an action stands on its arrow and in the list, renumbered at once', async () => {
    const body = (from: string) => ({ type: 'tactical' as const, systemId: TARGET, moves: [{ from, units: { cruiser: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } });
    const first = useGame.getState().addEntry(1, body(HOME), 'action');
    useGame.getState().addEntry(1, { type: 'pass' }, 'action');
    useGame.getState().addEntry(1, body(WAY), 'action');
    render(<PlanScreen />);
    const badges = () => [...document.querySelectorAll('.route-badge-number')].map(el => el.textContent);
    const froms = () => [...document.querySelectorAll('.route[role="img"]')].map(el => el.getAttribute('aria-label'));
    expect(badges()).toEqual(['1', '2']);
    expect(froms()[0]).toContain(HOME);
    expect(screen.getByRole('img', { name: 'Action 1' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Action 2' })).toBeVisible();
    act(() => useGame.getState().moveEntry(first, 'action', 2));
    expect(badges()).toEqual(['1', '2']);
    expect(froms()[0]).toContain(WAY);
    act(() => useGame.getState().setEntryStatus(first, 'cancelled'));
    expect(badges()).toEqual(['1']);
    expect(screen.queryByRole('img', { name: 'Action 2' })).toBeNull();
  });
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

const phase = (name: string) => within(screen.getByRole('region', { name }));

test('an empty round shows the four phases in order, each with a line of what it holds', () => {
  render(<PlanScreen />);
  expect(screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent)).toEqual(['Strategy', 'Actions', 'Status', 'Agenda']);
  expect(phase('Strategy').getByRole('button', { name: /Leadership/ })).toBeVisible();
  expect(phase('Actions').getByText(/Tactical actions/)).toBeVisible();
  expect(phase('Status').getByText(/New tokens/)).toBeVisible();
  expect(phase('Agenda').getByText(/No entries/)).toBeVisible();
  expect(phase('Agenda').queryByRole('button')).toBeNull();
});

test('an action goes under Actions; a filled section drops its line', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
  expect(phase('Actions').getByRole('listitem', { name: 'Pass' })).toBeVisible();
  expect(phase('Actions').queryByText(/Tactical actions/)).toBeNull();
});

test('the status section makes one entry of tokens and points, and the menu has no such action', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  expect(phase('Actions').queryByRole('button', { name: /status|Tokens and points/i })).toBeNull();
  await userEvent.click(phase('Status').getByRole('button', { name: 'Tokens and points' }));
  expect(entries().filter(e => e.type === 'statusTokens')).toHaveLength(1);
  // The add control is gone; only the entry's own label is left. A status entry has no moving controls.
  const row = within(phase('Status').getByRole('listitem', { name: 'Tokens and points' }));
  expect(phase('Status').getAllByRole('button', { name: 'Tokens and points' })).toEqual([row.getByRole('button', { name: 'Tokens and points' })]);
  expect(row.queryByRole('button', { name: 'Move up' })).toBeNull();
  expect(row.queryByRole('button', { name: 'Drag' })).toBeNull();
  expect(phase('Status').getByText(/Planets refresh at the start of the next round/)).toBeVisible();
});

test('status points: every player in a stepper with a running total, in the summary and the players panel', async () => {
  useGame.getState().setOpponent(0, { faction: 'sol' });
  render(<PlanScreen />);
  await userEvent.click(phase('Status').getByRole('button', { name: 'Tokens and points' }));
  const row = within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  // My faction, a named opponent and the unnamed ones.
  expect(row.getByRole('group', { name: 'Arborec' })).toBeVisible();
  expect(row.getByRole('group', { name: 'Sol' })).toBeVisible();
  expect(row.getByRole('group', { name: 'Player 6' })).toBeVisible();
  expect(row.getByRole('button', { name: 'Remove one Sol' })).toBeDisabled();

  await userEvent.click(row.getByRole('button', { name: 'Add one Arborec' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Sol' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Sol' }));
  const opponent = game().opponents[0].id;
  expect(entries()[0]).toMatchObject({ vp: 1, opponentVp: { [opponent]: 2 } });
  expect(row.getByRole('group', { name: 'Sol' })).toHaveTextContent('total 2');
  expect(cell('VP')).toHaveTextContent('0 → 1');

  await userEvent.click(screen.getByRole('button', { name: 'Players' }));
  const totals = [...document.querySelectorAll('.player-card .player-vp')].map(el => el.textContent);
  expect(totals.slice(0, 3)).toEqual(['Points 1', 'Points 2', 'Points 0']);
  expect(document.querySelector('.player-card button[aria-label*="points" i]')).toBeNull();
});

test('the status phase entry distributes tokens', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  const entry = entries()[0];
  expect(entry).toMatchObject({ type: 'statusTokens', phase: 'status', tactic: 0, fleet: 0, strategy: 0 });
  const row = within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  expect(row.getByText('Distribute tokens: 2 left')).toBeVisible();
  await userEvent.click(row.getByRole('button', { name: 'Tactic: 0' }));
  await userEvent.click(row.getByRole('button', { name: 'Fleet: 0' }));
  expect(entries()[0]).toMatchObject({ tactic: 1, fleet: 1, strategy: 0 });
  expect(cell('Tactic')).toHaveTextContent('3 → 4');
  expect(row.getByText('Distribute tokens: 0 left')).toBeVisible();
  // No second status button stands beside the label.
  expect(screen.getAllByRole('button', { name: 'Tokens and points' })).toHaveLength(1);
  expect(row.getByRole('button', { name: 'Tokens and points' })).toBeVisible();
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

test('Add action stands in the Actions section, in the block that sticks to the bottom of the panel', () => {
  render(<PlanScreen />);
  expect(phase('Actions').getByRole('button', { name: 'Add action' }).closest('.phase-add')).not.toBeNull();
});

test('the shop opens on the active system and shows the price of each unit', async () => {
  await chooseSystem(HOME);
  await userEvent.click(screen.getByRole('button', { name: 'Open the shop' }));
  const shop = within(screen.getByRole('dialog'));
  expect(shop.getByRole('button', { name: 'Build' })).toHaveAttribute('aria-pressed', 'true');
  expect(shop.getByRole('button', { name: 'Cruiser' })).toHaveTextContent('2');
  expect(shop.getByRole('button', { name: 'Fighter' })).toHaveTextContent('½');
});

test('a status tile always adds: beyond 2 it warns, naming abilities, and reset clears the distribution', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  const row = within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  expect(row.getByRole('button', { name: 'Reset' })).toBeDisabled();
  await userEvent.click(row.getByRole('button', { name: 'Tactic: 0' }));
  await userEvent.click(row.getByRole('button', { name: 'Tactic: 1' }));
  expect(row.queryByText(/usually from abilities/)).toBeNull();
  await userEvent.click(row.getByRole('button', { name: 'Tactic: 2' }));
  expect(entries()[0]).toMatchObject({ tactic: 3 });
  expect(cell('Tactic')).toHaveTextContent('3 → 6');
  expect(row.getByText(/usually from abilities/)).toBeVisible();
  await userEvent.click(row.getByRole('button', { name: 'Reset' }));
  expect(entries()[0]).toMatchObject({ tactic: 0, fleet: 0, strategy: 0 });
  expect(row.queryByText(/usually from abilities/)).toBeNull();
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
