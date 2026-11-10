import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { project } from '../../domain/project';
import type { Entry } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { gameSchema } from '../../storage/schema';
import { App } from '../App';
import { PlanScreen } from './PlanScreen';
import type { Move } from '../plan/tactical';

const pack = loadPack(['pok']);
const HOME = '1,0';
const TARGET = '0,1';
/** The hint that asks something of the map; the note about an unfinished map is not one. */
const choiceHint = () => screen.queryAllByRole('status').find(s => !/map is not complete/.test(s.textContent ?? '')) ?? null;

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
  expect(choiceHint()).toBeNull();
  await addRouteByTaps(HOME);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
});

describe('the system and the sources, chosen from the panel', () => {
  const field = () => screen.getByRole('button', { name: /^Active system: 25/ });
  const addSource = () => screen.getByRole('button', { name: 'Add source' });

  test('the field of an empty action chooses another system for the same entry', async () => {
    await chooseSystem();
    const id = tactical().id;
    await userEvent.click(field());
    expect(screen.getByRole('status')).toHaveTextContent('Tap the new active system');
    await userEvent.click(tile(WAY));
    expect(entries()).toHaveLength(1);
    expect(tactical()).toMatchObject({ id, systemId: WAY });
    expect(cell('Tactic')).toHaveTextContent('3 → 2');
    expect(choiceHint()).toBeNull();
    expect(tile(WAY)).toHaveClass('tile-active');
    expect(tile(TARGET)).not.toHaveClass('tile-active');
  });

  test('a second tap on the field, or on the same system, gives up the choice', async () => {
    await chooseSystem();
    await userEvent.click(field());
    await userEvent.click(field());
    expect(choiceHint()).toBeNull();
    await userEvent.click(field());
    await userEvent.click(tile(TARGET));
    expect(choiceHint()).toBeNull();
    expect(tactical().systemId).toBe(TARGET);
  });

  test('with anything filled in the field is no longer a button', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('button', { name: /^Active system/ })).toBeNull();
    expect(screen.getByText('Active system: 25')).toBeVisible();
  });

  test('a production or a landing keeps the system too, and a tap on it does not take the action back', async () => {
    await chooseSystem();
    act(() => useGame.getState().updateEntry(tactical().id, { production: { fighter: 1 } }));
    expect(screen.queryByRole('button', { name: /^Active system/ })).toBeNull();
    await userEvent.click(tile(TARGET));
    expect(entries()).toHaveLength(1);
    expect(tactical().production).toEqual({ fighter: 1 });
  });

  test('an empty action still goes back to choosing on a tap on its system', async () => {
    await chooseSystem();
    await userEvent.click(tile(TARGET));
    expect(entries()).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Tap the system');
  });

  test('choosing a source only starts the route: nothing is recorded until it reaches the active system', async () => {
    await chooseSystem();
    await userEvent.click(addSource());
    expect(addSource()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Tap the system the ships come from');
    await userEvent.click(tile(HOME));
    expect(tactical().moves).toEqual([]);
    expect(addSource()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Flight 5 → 25')).toBeNull();
    expect(tile(HOME)).toHaveClass('tile-path');
    expect(screen.getByRole('status')).toHaveTextContent('Tap the hexes in order');
    await addRouteByTaps(WAY, TARGET);
    expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
    expect(screen.getByText('Flight 5 → 25')).toBeVisible();
  });

  test('a source already there starts a new way, and its ships stay', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, WAY, TARGET);
    act(() => useGame.getState().updateEntry(tactical().id, { moves: [{ from: HOME, units: { fighter: 1 }, via: [WAY] }] }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(addSource());
    await userEvent.click(tile(HOME));
    expect(tactical().moves).toEqual([{ from: HOME, units: { fighter: 1 }, via: [WAY] }]);
    await userEvent.click(tile(TARGET));
    expect(tactical().moves).toEqual([{ from: HOME, units: { fighter: 1 } }]);
  });

  test('the route under way shows the speed of the source and lights what it still reaches', async () => {
    useGame.getState().setTile(HOME, pack.factions.arborec.homeTile);
    await chooseSystem();
    await userEvent.click(addSource());
    await userEvent.click(tile(HOME));
    expect(screen.getByRole('status')).toHaveTextContent(/Speed \d: 0 made, \d left/);
    expect(tile(WAY)).toHaveClass('tile-valid');
    await userEvent.click(tile(WAY));
    expect(screen.getByRole('status')).toHaveTextContent(/Speed \d: 1 made/);
  });

  test('a source without ships has no speed to show, and the route still starts and says its distance', async () => {
    await chooseSystem();
    await userEvent.click(addSource());
    await userEvent.click(tile(WAY));
    expect(tile(WAY)).toHaveClass('tile-path');
    expect(screen.getByRole('status')).not.toHaveTextContent('Speed');
    await userEvent.click(tile(HOME));
    expect(screen.getByRole('status')).toHaveTextContent('Distance: 1');
  });

  test('a route says its distance in its picker and on its row', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, WAY, TARGET);
    expect(document.querySelector('.picker-distance')).toHaveTextContent('Distance: 2');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(document.querySelector('.source-button')).toHaveTextContent('Distance: 2');
  });

  test('a second tap on the button or a tap on the active system adds nothing', async () => {
    await chooseSystem();
    await userEvent.click(addSource());
    await userEvent.click(addSource());
    expect(choiceHint()).toBeNull();
    await userEvent.click(addSource());
    await userEvent.click(tile(TARGET));
    expect(choiceHint()).toBeNull();
    expect(tactical().moves).toEqual([]);
    expect(entries()).toHaveLength(1);
  });

  test('a source goes by its cross and by the button in its picker', async () => {
    await chooseSystem();
    await userEvent.click(addSource());
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Remove route' }));
    expect(tactical().moves).toEqual([]);
    await userEvent.click(addSource());
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove source 5' }));
    expect(tactical().moves).toEqual([]);
  });

  test('leaving the editor ends the choice', async () => {
    await chooseSystem();
    await userEvent.click(addSource());
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(choiceHint()).toBeNull();
    await userEvent.click(tile(WAY));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(tactical().moves).toEqual([]);
  });
});

describe('a route of drags and taps', () => {
  const NEXT = '2,1';
  beforeEach(() => useGame.getState().setTile(NEXT, '40'));
  const press = (slot: string) => fireEvent.pointerDown(tile(slot), { pointerId: 1, clientX: 1, clientY: 1, isPrimary: true, button: 0 });
  const moveTo = (slot: string) => {
    hoverPath(slot);
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 2, clientY: 2 });
  };
  const lift = () => fireEvent.pointerUp(window, { pointerId: 1, clientX: 2, clientY: 2 });

  test('a drag, a lifted finger, a tap, and a drag again make one route', async () => {
    await chooseSystem();
    press(HOME);
    moveTo(WAY);
    lift();
    expect(tactical().moves).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('finish on the active system');
    expect(tile(WAY)).toHaveClass('tile-path');
    await userEvent.click(tile(NEXT));
    expect(tile(NEXT)).toHaveClass('tile-path');
    press(NEXT);
    moveTo(TARGET);
    lift();
    expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY, NEXT] }]);
    expect(choiceHint()).toBeNull();
  });

  test('taps first, then a drag from the last hex finishes it', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, WAY);
    press(WAY);
    moveTo(TARGET);
    lift();
    expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
  });

  test('a drag, then a tap on the active system finishes it', async () => {
    await chooseSystem();
    press(HOME);
    moveTo(WAY);
    lift();
    await userEvent.click(tile(TARGET));
    expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
  });

  test('with a route under way a drag from another hex moves the map, not the route', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, WAY);
    press(NEXT);
    moveTo(TARGET);
    lift();
    expect(tactical().moves).toEqual([]);
    expect(tile(NEXT)).not.toHaveClass('tile-path');
    expect(tile(WAY)).toHaveClass('tile-path');
  });

  test('a second finger during a later stroke keeps what was already laid', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, WAY);
    press(WAY);
    moveTo(NEXT);
    fireEvent.pointerDown(window, { pointerId: 2 });
    expect(tile(WAY)).toHaveClass('tile-path');
    expect(tile(NEXT)).not.toHaveClass('tile-path');
    await userEvent.click(tile(TARGET));
    expect(tactical().moves).toEqual([{ from: HOME, units: {}, via: [WAY] }]);
  });

  test('a stroke over the active system and past it does not put it inside the route', async () => {
    await chooseSystem();
    press(HOME);
    moveTo(TARGET);
    moveTo(WAY);
    lift();
    expect(tile(WAY)).not.toHaveClass('tile-path');
    await userEvent.click(tile(TARGET));
    expect(tactical().moves).toEqual([{ from: HOME, units: {} }]);
  });

  test('adding a source drops the route under way', async () => {
    await chooseSystem();
    press(HOME);
    moveTo(WAY);
    lift();
    await userEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(tile(WAY)).not.toHaveClass('tile-path');
    expect(screen.getByRole('status')).toHaveTextContent('Tap the system the ships come from');
  });
});

describe('an opponent in the plan', () => {
  const noPay = { planets: [], tradeGoods: 0 };
  const rival = () => game().opponents[0];
  beforeEach(() => useGame.getState().setOpponent(0, { faction: 'sol' }));
  const whose = () => within(screen.getByRole('group', { name: 'Whose action' }));

  test('the choice of whose action comes first, and the entry then belongs to them', async () => {
    render(<PlanScreen />);
    expect(whose().getByRole('button', { name: 'Mine' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(whose().getByRole('button', { name: /Sol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(entries()[0].owner).toBe(rival().id);
  });

  test('with many players a rival takes three letters, the colour is the edge of the cell and the full name stays for the reader', () => {
    useGame.getState().setOpponent(1, { faction: 'hacan' });
    render(<PlanScreen />);
    const hacan = whose().getByRole('button', { name: 'Hacan' });
    expect(hacan).toHaveTextContent(/^Hac$/);
    expect(hacan.style.getPropertyValue('--owner')).toBe(`var(--player-${game().opponents[1].color})`);
    expect(whose().getByRole('button', { name: 'Player 4' })).toHaveTextContent(/^4$/);
    expect(hacan.querySelector('.owner-dot')).toBeNull();
    expect(whose().getByRole('button', { name: 'Mine' })).toHaveTextContent(/^Mine$/);
  });

  test('with few players a rival keeps the whole name', () => {
    useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pack);
    useGame.getState().setOpponent(0, { faction: 'hacan' });
    render(<PlanScreen />);
    expect(whose().getByRole('button', { name: 'Hacan' })).toHaveTextContent(/^Hacan$/);
  });

  test('their row wears their colour and says whose it is', async () => {
    useGame.getState().addEntry(1, { type: 'pass' }, 'action', rival().id);
    render(<PlanScreen />);
    const row = screen.getByRole('listitem', { name: /Sol/ });
    expect(row).toHaveClass('entry-rival');
    expect(row.style.getPropertyValue('--owner')).toBe(`var(--player-${rival().color})`);
  });

  test('my own rows stay as they were', async () => {
    useGame.getState().addEntry(1, { type: 'pass' }, 'action');
    render(<PlanScreen />);
    expect(screen.getByRole('listitem', { name: 'Pass' })).not.toHaveClass('entry-rival');
  });

  test('a tactical action of theirs spends their token, not mine, and the panel says whose it is', async () => {
    render(<PlanScreen />);
    await userEvent.click(whose().getByRole('button', { name: /Sol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    expect(document.querySelector('.acting-as')).toHaveTextContent('Sol');
    await userEvent.click(tile(TARGET));
    expect(tactical()).toMatchObject({ owner: rival().id, systemId: TARGET });
    expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
    expect(document.querySelector('.acting-as')).toHaveTextContent('Sol');
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: /Command token of/ })).toBeInTheDocument();
    expect(tile(TARGET)).not.toHaveClass('tile-activated');
  });

  test('their units move on the map, and their route wears their colour', () => {
    useGame.getState().setEnemyUnits(HOME, rival().id, { cruiser: 2 });
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: { cruiser: 1 } }], landings: [], production: {}, payment: noPay }, 'action', rival().id);
    render(<PlanScreen />);
    expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: /Cruiser ×1/ })).toBeInTheDocument();
    expect((document.querySelector('.route') as SVGElement).style.getPropertyValue('--route')).toBe(`var(--player-${rival().color})`);
  });

  test('a warning does not repaint a route: mine keeps its colour, theirs keeps theirs', () => {
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: { dreadnought: 9 } }], landings: [], production: {}, payment: noPay }, 'action');
    useGame.getState().addEntry(1, { type: 'tactical', systemId: WAY, moves: [{ from: HOME, units: { dreadnought: 9 } }], landings: [], production: {}, payment: noPay }, 'action', rival().id);
    render(<PlanScreen />);
    const [mine, theirs] = [...document.querySelectorAll<SVGElement>('.route:not(.route-badge)')];
    expect(screen.getAllByText(/is missing/).length).toBeGreaterThan(0);
    expect(mine.style.getPropertyValue('--route')).toBe('');
    expect(theirs.style.getPropertyValue('--route')).toBe(`var(--player-${rival().color})`);
    expect(document.querySelector('.arrow-warn')).toBeNull();
  });

  test('the number of their action on the map wears their colour, and mine stays as it was', () => {
    useGame.getState().setEnemyUnits(HOME, rival().id, { cruiser: 1 });
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: { cruiser: 1 } }], landings: [], production: {}, payment: noPay }, 'action', rival().id);
    useGame.getState().addEntry(1, { type: 'tactical', systemId: WAY, moves: [{ from: HOME, units: { carrier: 1 } }], landings: [], production: {}, payment: noPay }, 'action');
    render(<PlanScreen />);
    const [theirs, mine] = [...document.querySelectorAll<SVGElement>('.route-badge')];
    expect(theirs.style.getPropertyValue('--route')).toBe(`var(--player-${rival().color})`);
    expect(mine.style.getPropertyValue('--route')).toBe('');
    expect(screen.getByRole('listitem', { name: /Sol/ }).querySelector('.order-hex')).toBeInTheDocument();
  });

  test('in their battle a loss is theirs, mine stay out of reach', async () => {
    useGame.getState().setEnemyUnits(TARGET, rival().id, { cruiser: 2 });
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: TARGET, units: { fighter: 1 } } } }, 'strategy');
    const id = useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: noPay }, 'action', rival().id);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Sol: Tactical action/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Battle / }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: /^Cruiser ×2/ }));
    expect(entries().find(e => e.id === id)).toMatchObject({ losses: { cruiser: 1 } });
    await userEvent.click(dialog.getByRole('button', { name: /^Fighter ×1/ }));
    expect(entries().filter(e => e.type === 'adjustment')).toHaveLength(1);
  });

  test('their purchase is theirs and paid from their pool', async () => {
    useGame.getState().setTile(TARGET, pack.factions.sol.homeTile);
    const id = useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: noPay }, 'action', rival().id);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Sol: Tactical action/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Production / }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' }));
    expect(entries().find(e => e.id === id)).toMatchObject({ production: { cruiser: 1 } });
    expect(project(game(), plan(), 'forecast', pack).state.systems[TARGET]).toBeUndefined();
  });

  test('a saved game keeps whose an entry is', () => {
    useGame.getState().addEntry(1, { type: 'pass' }, 'action', rival().id);
    const saved = gameSchema.parse(game()) as unknown as ReturnType<typeof game>;
    expect(saved.plans[0].rounds[0].entries[0].owner).toBe(rival().id);
  });
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
  // The picker of an empty source offers no ships it does not have (#1).
  expect(screen.getByText('No ships here.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Take one Dreadnought' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Fly' })).toBeDisabled();
});

test('the outline of an arrow goes round its head too, as one shape with the line', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  const head = document.querySelector('.route-head')!;
  const outline = document.querySelector('.route-casings .route-head-casing')!;
  expect(outline.getAttribute('points')).toBe(head.getAttribute('points'));
  expect(document.querySelector('.route-casings .route-casing')).not.toBeNull();
});

test('the number badge of an arrow has the same outline, under the badge itself', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  const badge = document.querySelector('.route-badge')!;
  const outline = badge.querySelector('.route-badge-casing')!;
  const hex = badge.querySelector('.route-badge-hex')!;
  expect(outline.getAttribute('points')).toBe(hex.getAttribute('points'));
  expect(outline.compareDocumentPosition(hex) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('each source is listed with its units and can be removed', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
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
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: /^5/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Take one Carrier' }));
  // The flight is a step with no «Done»: back to the editor, and the editor closes.
  expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(tactical().moves).toEqual([{ from: HOME, units: { carrier: 1 } }]);
});

test('a tap on the active system with no routes takes the action back: token returned, choosing again, one undo step', async () => {
  await chooseSystem();
  expect(screen.getByText('Active system: 25')).toBeVisible();
  expect(screen.getByText(/^Wrong system\?/)).toBeVisible();
  await userEvent.click(tile(TARGET));
  expect(entries()).toHaveLength(0);
  expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
  expect(screen.getByRole('status')).toHaveTextContent('Tap the system');
  await userEvent.click(tile(HOME));
  expect(tactical().systemId).toBe(HOME);
  await userEvent.click(screen.getByRole('button', { name: 'Done' }));
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(entries()).toHaveLength(0);
});

test('with a route a tap on the active system cancels nothing', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(tile(TARGET));
  expect(entries()).toHaveLength(1);
  expect(screen.queryByText(/^Wrong system\?/)).toBeNull();
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
  expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();

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
  expect(screen.getByRole('button', { name: 'Control' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('landing puts ground units on a planet and changes its control', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  const planet = screen.getByRole('group', { name: 'Landing on Quann' });
  expect(planet).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
  expect(tactical().landings).toEqual([{ planetId: 'quann', units: { infantry: 1 } }]);
  expect(within(tile(TARGET) as HTMLElement).getByRole('group', { name: /Quann: .*yours/ })).toBeInTheDocument();
});

test('a planet of the landing shows its picture, name and state, and who stands there', async () => {
  useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { ground: { quann: { mech: 1 } } } }, 'strategy');
  useGame.getState().setEnemyGround('quann', useGame.getState().game!.opponents[0].id, { infantry: 2 });
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  const group = screen.getByRole('group', { name: 'Landing on Quann' });
  const planet = within(group);
  expect(group.querySelector('.planet-disc')).toBeInTheDocument();
  expect(group).toHaveTextContent(/Quann/);
  expect(group).toHaveTextContent(/Ready/);
  expect(planet.getByRole('img', { name: 'Mech ×1' })).toBeInTheDocument();
  expect(planet.getByRole('img', { name: 'Infantry ×2' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
  expect(planet.getByRole('button', { name: 'Give back Infantry' })).toBeVisible();
});

test('with two planets each has its own buttons, and what they land is shared', async () => {
  useGame.getState().setTile(TARGET, '27');
  await chooseSystem();
  act(() => useGame.getState().updateEntry(tactical().id, { moves: [{ from: TARGET, units: { infantry: 2 } }] }));
  useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: TARGET, units: { infantry: 2 } } } }, 'strategy');
  const groups = screen.getAllByRole('group', { name: /^Landing on / });
  expect(groups).toHaveLength(2);
  const [first, second] = groups.map(g => within(g));
  await userEvent.click(second.getByRole('button', { name: 'Land one Infantry' }));
  expect(tactical().landings.map(l => l.units)).toEqual([{ infantry: 1 }]);
  expect(first.queryByRole('button', { name: 'Give back Infantry' })).toBeNull();
  expect(second.getByRole('button', { name: 'Give back Infantry' })).toBeVisible();
  await userEvent.click(first.getByRole('button', { name: 'Land one Infantry' }));
  expect(tactical().landings).toHaveLength(2);
});

test('landing goes by icons: a tap adds one, a tap on the landed one gives it back', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  const planet = within(screen.getByRole('group', { name: 'Landing on Quann' }));
  expect(planet.queryByRole('button', { name: 'Give back Infantry' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
  expect(tactical().landings).toEqual([{ planetId: 'quann', units: { infantry: 2 } }]);
  await userEvent.click(planet.getByRole('button', { name: 'Give back Infantry' }));
  await userEvent.click(planet.getByRole('button', { name: 'Give back Infantry' }));
  expect(tactical().landings).toEqual([]);
  expect(planet.queryByRole('button', { name: 'Give back Infantry' })).toBeNull();
});

describe('a system already activated', () => {
  const noPay = { planets: [], tradeGoods: 0 };

  test('stands out by its fill, not only by the token', async () => {
    await chooseSystem();
    expect(tile(TARGET)).toHaveClass('tile-activated');
    expect(tile(HOME)).not.toHaveClass('tile-activated');
  });

  test('warns when ships are sent out of it, and only in a later action', async () => {
    useGame.getState().addEntry(1, { type: 'tactical', systemId: HOME, moves: [], landings: [], production: {}, payment: noPay }, 'action');
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: {} }], landings: [], production: {}, payment: noPay }, 'action');
    const warnings = project(game(), plan(), 'forecast', pack).warningsByEntry;
    const [first, second] = entries();
    expect(warnings[first.id] ?? []).toEqual([]);
    expect(warnings[second.id]).toContainEqual({ code: 'sourceActivated', params: { from: HOME } });
  });

  test('flying through it is allowed', () => {
    useGame.getState().addEntry(1, { type: 'tactical', systemId: WAY, moves: [], landings: [], production: {}, payment: noPay }, 'action');
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [{ from: HOME, units: {}, via: [WAY] }], landings: [], production: {}, payment: noPay }, 'action');
    const warnings = project(game(), plan(), 'forecast', pack).warningsByEntry[entries()[1].id] ?? [];
    expect(warnings.map(w => w.code)).not.toContain('sourceActivated');
  });
});

describe('the battle of a tactical action', () => {
  const action = () => entries().find((e): e is Extract<Entry, { type: 'tactical' }> => e.type === 'tactical')!;
  async function fourCruisersArrive() {
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: HOME, units: { cruiser: 4 } } } }, 'strategy');
    await chooseSystem();
    act(() => useGame.getState().updateEntry(action().id, { moves: [{ from: HOME, units: { cruiser: 4 } }] }));
  }
  const startBattle = () => userEvent.click(screen.getByRole('button', { name: /^Battle / }));
  const dialog = () => within(screen.getByRole('dialog'));

  test('over the fleet pool the result offers to remove the excess in the big hex, and the warning goes once enough are removed (#3)', async () => {
    const result = () => screen.getByRole('group', { name: 'Action result' });
    const excess = () => within(result()).queryByRole('button', { name: /^Excess ships/ });
    await fourCruisersArrive();
    expect(result()).toHaveTextContent(/fleet pool/);
    await userEvent.click(excess()!);
    expect(dialog().queryByRole('group', { name: 'Mode' })).toBeNull();
    expect(dialog().getByRole('group', { name: 'Removed beyond the fleet pool' })).toBeVisible();
    await userEvent.click(dialog().getByRole('button', { name: /^Cruiser ×4/ }));
    expect(action().fleetRemovals).toEqual({ cruiser: 1 });
    expect(action().losses).toBeUndefined();
    await userEvent.keyboard('{Escape}');
    expect(result()).not.toHaveTextContent(/fleet pool/);
    // The removal stays editable from the result while it holds anything.
    expect(excess()).toHaveTextContent('Cruiser 1');
    await userEvent.click(excess()!);
    await userEvent.click(dialog().getByRole('button', { name: 'Give back Cruiser' }));
    expect(action().fleetRemovals).toBeUndefined();
  });

  test('the button opens the big hex in its battle, and no units are chosen in the panel', async () => {
    await fourCruisersArrive();
    expect(screen.queryByRole('group', { name: 'Battle' })).toBeNull();
    await startBattle();
    expect(dialog().queryByRole('group', { name: 'Mode' })).toBeNull();
    expect(dialog().getByText(/^Tap a token to record a loss/)).toBeVisible();
  });

  test('a loss in that battle belongs to the action, and the fleet limit was already broken on arrival', async () => {
    await fourCruisersArrive();
    expect(screen.getByRole('group', { name: 'Action result' })).toHaveTextContent(/fleet pool/);
    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Cruiser ×4/ }));
    expect(action().losses).toEqual({ cruiser: 1 });
    expect(entries().filter(e => e.type === 'adjustment')).toHaveLength(1);
    // 37.3: the fleet pool holds the moment the ships arrive, so the battle does not undo it.
    expect(screen.getByRole('group', { name: 'Action result' })).toHaveTextContent(/fleet pool/);
    await userEvent.click(within(dialog().getByRole('group', { name: 'Losses, mine' })).getByRole('button', { name: /Give back Cruiser/ }));
    expect(action().losses).toBeUndefined();
    expect(screen.getByRole('group', { name: 'Action result' })).toHaveTextContent(/fleet pool/);
  });

  test('the panel then names what was lost and offers to go on', async () => {
    await fourCruisersArrive();
    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Cruiser ×4/ }));
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    // The row of the battle names what was lost, and a tap on it goes on with the battle.
    expect(screen.getByRole('button', { name: 'Battle Losses: Cruiser 1' })).toBeVisible();
  });

  test('a loss on a planet belongs to the action too', async () => {
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { ground: { quann: { infantry: 2 } } } }, 'strategy');
    await chooseSystem();
    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Infantry ×2/ }));
    expect(action().groundLosses).toEqual({ quann: { infantry: 1 } });
    expect(project(game(), plan(), 'forecast', pack).state.ground.quann).toEqual({ infantry: 1 });
  });

  test('a battle opened by a tap on the map still goes to the round', async () => {
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: TARGET, units: { cruiser: 2 } } } }, 'strategy');
    render(<PlanScreen />);
    await userEvent.click(tile(TARGET));
    await userEvent.click(dialog().getByRole('button', { name: 'Battle' }));
    await userEvent.click(dialog().getByRole('button', { name: /^Cruiser ×2/ }));
    expect(entries().some(e => e.type === 'adjustment' && e.kind === 'losses')).toBe(true);
  });

  test('a loss fills the action in: the active system can no longer change', async () => {
    await chooseSystem();
    act(() => useGame.getState().updateEntry(action().id, { losses: { cruiser: 1 } }));
    expect(screen.queryByRole('button', { name: /^Active system/ })).toBeNull();
    act(() => useGame.getState().updateEntry(action().id, { losses: undefined, groundLosses: { quann: { infantry: 1 } } }));
    expect(screen.queryByRole('button', { name: /^Active system/ })).toBeNull();
  });

  test('what fell in battle cannot land: only what is left is counted for the landing', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Land one Infantry' })).toHaveTextContent('2');
    act(() => useGame.getState().updateEntry(action().id, { losses: { infantry: 1 } }));
    expect(screen.getByRole('button', { name: 'Land one Infantry' })).toHaveTextContent('1');
  });

  test('a unit of the landing lost in the battle leaves the landing, and giving it back lands it again (78.6.2)', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
    expect(action().landings).toEqual([{ planetId: 'quann', units: { infantry: 2 } }]);

    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Infantry ×2/ }));
    expect(action().landings).toEqual([{ planetId: 'quann', units: { infantry: 1 } }]);
    expect(action().losses).toEqual({ infantry: 1 });
    expect(action().groundLosses).toBeUndefined();
    const warnings = project(game(), plan(), 'forecast', pack).warningsByEntry[action().id];
    expect(warnings.map(w => w.code)).not.toContain('landingOverLimit');
    expect(warnings.map(w => w.code)).not.toContain('unitsMissing');

    await userEvent.click(within(dialog().getByRole('group', { name: 'Losses, mine' })).getByRole('button', { name: /Give back Infantry/ }));
    expect(action().losses).toBeUndefined();
    expect(action().landings).toEqual([{ planetId: 'quann', units: { infantry: 2 } }]);
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Give back Infantry' })).toHaveTextContent('2');
  });

  test('the last unit of a landing lost in the battle takes the planet with it', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
    expect(project(game(), plan(), 'forecast', pack).state.control.quann).toBe('me');
    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Infantry ×1/ }));
    // The landing stays, empty, so that giving the unit back lands it there again.
    expect(action().landings).toEqual([{ planetId: 'quann', units: {} }]);
    expect(project(game(), plan(), 'forecast', pack).state.control.quann).toBeUndefined();
  });

  test('those who stood on the planet before are lost apart from the landing, and the landing block shows who is left', async () => {
    useGame.getState().addEntry(1, { type: 'adjustment', label: '', delta: { ground: { quann: { mech: 2 } } } }, 'strategy');
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    const group = () => within(screen.getByRole('group', { name: 'Landing on Quann' }));
    expect(group().getByRole('img', { name: 'Mech ×2' })).toBeInTheDocument();
    await startBattle();
    await userEvent.click(dialog().getByRole('button', { name: /^Mech ×2/ }));
    expect(action().groundLosses).toEqual({ quann: { mech: 1 } });
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    expect(group().getByRole('img', { name: 'Mech ×1' })).toBeInTheDocument();
  });

  test('the details read the losses out', async () => {
    await fourCruisersArrive();
    act(() => useGame.getState().updateEntry(action().id, { losses: { cruiser: 1 } }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: /^Tactical action · 25/ }));
    expect(screen.getByText('Lost in battle')).toBeVisible();
  });

  test('a saved game keeps its losses', async () => {
    await fourCruisersArrive();
    act(() => useGame.getState().updateEntry(action().id, { losses: { cruiser: 1 }, groundLosses: { quann: { infantry: 1 } } }));
    const saved = gameSchema.parse(game()) as unknown as ReturnType<typeof game>;
    const entry = saved.plans[0].rounds.flatMap(r => r.entries).find(e => e.type === 'tactical');
    expect(entry).toMatchObject({ losses: { cruiser: 1 }, groundLosses: { quann: { infantry: 1 } } });
  });
});

test('the optional landing opens by a chevron icon', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Landing').closest('summary')!.querySelector('svg')).toBeInTheDocument();
});

test('landing is hidden in a system without planets', async () => {
  useGame.getState().setTile(TARGET, '39');
  await chooseSystem();
  expect(screen.queryByText('Landing')).toBeNull();
  expect(screen.queryByText(/No planets/)).toBeNull();
});

test('landing is hidden while no ground units are in the system', async () => {
  await chooseSystem();
  expect(screen.queryByText('Landing')).toBeNull();
});

test('landing shows counts of what arrived and what is assigned; no icon for a unit that is absent', async () => {
  await chooseSystem();
  await addRouteByTaps(HOME, TARGET);
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Take one Infantry' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Landing')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Land one Infantry' })).toHaveTextContent('2');
  expect(screen.queryByRole('button', { name: 'Land one Mech' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
  // The landing writes a count of one too, on both pictures.
  expect(screen.getByRole('button', { name: 'Land one Infantry' })).toHaveTextContent('1');
  expect(screen.getByRole('button', { name: 'Give back Infantry' })).toHaveTextContent('1');
});

test('a landing whose units are gone stays visible, can go over the limit, and warns', async () => {
  await chooseSystem();
  act(() => useGame.getState().updateEntry(tactical().id, { landings: [{ planetId: 'quann', units: { infantry: 1 } }] }));
  expect(screen.getByText('Landing')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Land one Infantry' })).toHaveTextContent('0');
  await userEvent.click(screen.getByRole('button', { name: 'Land one Infantry' }));
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

test('production without a dock warns once something is built, and still works', async () => {
  await chooseSystem();
  expect(screen.queryByText(/no unit of yours with Production/)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: /^Production / }));
  expect(screen.queryByText(/no unit of yours with Production/)).toBeNull();
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' }));
  expect(tactical().production).toEqual({ cruiser: 1 });
  expect(within(screen.getByRole('dialog')).getByText(/no unit of yours with Production/)).toBeVisible();
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
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Setup' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cruiser' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(within(tile(TARGET) as HTMLElement).getByRole('img', { name: 'Cruiser ×1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(within(tile(TARGET) as HTMLElement).queryByRole('img', { name: 'Cruiser ×1' })).toBeNull();
});

test('production picks the payment by itself and warns about the shortfall; manual choice stops the auto pick', async () => {
  await chooseSystem(HOME);
  const shop = async (name: string | RegExp) => {
    await userEvent.click(screen.getByRole('button', { name: /^Production / }));
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
  await userEvent.click(within(screen.getByRole('group', { name: 'Payment' })).getByRole('button', { name: /Nestphar/ }));
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
  expect(screen.getAllByRole('list', { name: 'Warnings' }).length).toBeGreaterThan(0);
});

test('Done returns to the plan, and the pencil reopens the editor', async () => {
  await chooseSystem();
  await userEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /^Edit: Tactical action · 25/ }));
  expect(screen.getByRole('button', { name: 'Done' })).toBeVisible();
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
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
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
    await read(/^Manual adjustment/, /Trade goods \+2/);
    await read(/^Strategy: Imperial/, /Mecatol Rex under control/);
    await read(/^Secondary: Technology/, /Costs 1 strategy token/);
    await read(/^Tokens and points/, /tactic 1, fleet 1, strategy 0/);
    await userEvent.click(rowOf('Pass').getByRole('button', { name: 'Pass' }));
    // A pass is a turn too: its pencil opens the turn's acts; its name opens no reading.
    expect(rowOf('Pass').getByRole('button', { name: /^Edit/ })).toBeVisible();
    expect(screen.getByRole('listitem', { name: 'Pass' })).not.toHaveClass('entry-shown');
  });

  test('the pencil opens the editor and closes the reading', async () => {
    plannedRoute();
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Tactical action/ }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible();
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
    // While its ships are in the air the tiles change at once, in a layer of its own over the map.
    expect(document.querySelector('.hexmap-still')).toBeInTheDocument();
    expect(document.querySelector('.hexmap-overlay .flight-layer')).toBeInTheDocument();
    // On landing only the systems of the action move: the others are quiet, its own are not.
    expect(tile(HOME)).not.toHaveClass('tile-quiet');
    expect(tile(TARGET)).not.toHaveClass('tile-quiet');
    expect(document.querySelectorAll('.tile-quiet').length).toBeGreaterThan(0);
    // Their planets and tokens move in the layer over the map; the tiles stay on the map to take the taps.
    expect(document.querySelectorAll('.lift-layer .tile-lifted').length).toBe(document.querySelectorAll('.tile:not(.tile-quiet):not(.tile-lifted)').length);
    expect(tile(TARGET).querySelector('.tk')).toBeNull();
    // What flies has left its tile while the flight runs; the cargo on the way stays until the leader passes.
    expect(within(tile(HOME) as HTMLElement).queryByRole('img', { name: /Carrier/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(document.querySelector('.flight-layer')).toBeNull();
    expect(document.querySelector('.hexmap-still')).toBeNull();
    vi.useRealTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    await act(async () => { await new Promise(r => setTimeout(r, 450)); });
    expect(document.querySelector('.flight-layer')).toBeNull();
    vi.unstubAllGlobals();
    // Flights turned off in energy saving play none either; smooth motion turned off leaves them flying.
    // Each tap on the label opens or closes the details: the first tap here closes what the last check opened.
    document.documentElement.dataset.flights = 'off';
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    act(() => { vi.advanceTimersByTime(400); });
    expect(document.querySelector('.flight-layer')).toBeNull();
    delete document.documentElement.dataset.flights;
    document.documentElement.dataset.motion = 'off';
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    act(() => { vi.advanceTimersByTime(400); });
    expect(document.querySelector('.flight-layer')).toBeInTheDocument();
    vi.useRealTimers();
    delete document.documentElement.dataset.motion;
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
    expect(choiceHint()).toBeNull();
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
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
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
    expect(choiceHint()).toBeNull();
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
  expect(row.queryByRole('button', { name: 'Drag to move' })).toBeNull();
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

test('the status entry folds like the others: a second tap on its name, or a tap in the panel away from the actions', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  const row = () => within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  const label = () => row().getByRole('button', { name: 'Tokens and points' });
  expect(row().getByText('Distribute tokens: 2 left')).toBeVisible();
  // The fields opened with the entry fold on a tap on its name, as the steps of any other action do.
  await userEvent.click(label());
  expect(row().queryByText('Distribute tokens: 2 left')).toBeNull();
  expect(label()).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(label());
  expect(label()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.pointerDown(document.querySelector('.plan-panel .phase-title')!);
  expect(label()).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(row().getByRole('button', { name: /^Edit/ }));
  expect(row().getByText('Distribute tokens: 2 left')).toBeVisible();
  fireEvent.pointerDown(document.querySelector('.plan-panel .phase-title')!);
  expect(row().queryByText('Distribute tokens: 2 left')).toBeNull();
});

test('the status phase entry distributes tokens', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  const entry = entries()[0];
  expect(entry).toMatchObject({ type: 'statusTokens', phase: 'status', tactic: 0, fleet: 0, strategy: 0 });
  const row = within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  expect(row.getByText('Distribute tokens: 2 left')).toBeVisible();
  await userEvent.click(row.getByRole('button', { name: 'Add one Tactic' }));
  await userEvent.click(row.getByRole('button', { name: 'Add one Fleet' }));
  expect(entries()[0]).toMatchObject({ tactic: 1, fleet: 1, strategy: 0 });
  expect(cell('Tactic')).toHaveTextContent('3 → 4');
  expect(row.getByText('Distribute tokens: 0 left')).toBeVisible();
  // No second status button stands beside the label.
  expect(screen.getAllByRole('button', { name: 'Tokens and points' })).toHaveLength(1);
  expect(row.getByRole('button', { name: 'Tokens and points' })).toBeVisible();
});

describe('a manual adjustment', () => {
  async function openAdjustment() {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Manual adjustment' }));
  }
  const dialog = () => within(screen.getByRole('dialog'));

  test('opens a menu of its own in place of the list, like a tactical action', async () => {
    await openAdjustment();
    expect(screen.getByRole('heading', { name: 'Manual adjustment' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add action' })).toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: 'Label' }), 'Card: +2{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Add one Trade goods' }));
    expect(entries()[0]).toMatchObject({ label: 'Card: +2', delta: { tradeGoods: 1 } });
    expect(cell('Trade goods')).toHaveTextContent('0 → 1');
  });

  test('on the plan it is one short row, and the pencil brings the menu back', async () => {
    await openAdjustment();
    await userEvent.click(screen.getByRole('button', { name: 'Add one Trade goods' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    const row = within(screen.getByRole('listitem', { name: /Manual adjustment/ }));
    expect(row.queryByRole('textbox')).toBeNull();
    expect(row.queryByRole('button', { name: 'Add one Trade goods' })).toBeNull();
    await userEvent.click(row.getByRole('button', { name: /^Manual adjustment/ }));
    expect(row.getByText(/Trade goods \+1/)).toBeVisible();
    await userEvent.click(row.getByRole('button', { name: /^Edit: Manual adjustment/ }));
    expect(screen.getByRole('button', { name: 'Add one Trade goods' })).toBeVisible();
  });

  test('its system comes from the map, and its units are changed in the big hex, not in the menu', async () => {
    await openAdjustment();
    expect(screen.queryByRole('button', { name: 'Add one Carrier' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Choose on the map' }));
    expect(tile(HOME)).toHaveClass('tile-valid');
    expect(screen.getByText('Tap a tile on the map.')).toBeVisible();
    await userEvent.click(tile(HOME));
    expect(entries()[0]).toMatchObject({ delta: { units: { systemId: HOME, units: {} } } });
    // Only this adjustment's changes here: no other modes, no other players.
    expect(dialog().queryByRole('group', { name: 'Modes' })).toBeNull();
    expect(dialog().queryByRole('button', { name: 'Battle' })).toBeNull();
    expect(dialog().queryByRole('group', { name: 'Whose units' })).toBeNull();
    await userEvent.click(dialog().getByRole('button', { name: 'Cruiser' }));
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ delta: { units: { systemId: HOME, units: { cruiser: 1 } } } });
    await userEvent.click(dialog().getByRole('button', { name: /^Carrier ×/ }));
    expect(entries()[0]).toMatchObject({ delta: { units: { systemId: HOME, units: { cruiser: 1, carrier: -1 } } } });
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('button', { name: 'Remove one Carrier' })).toBeNull();
  });

  test('the system row opens the big hex again, and its cross clears the system', async () => {
    await openAdjustment();
    await userEvent.click(screen.getByRole('button', { name: 'Choose on the map' }));
    await userEvent.click(tile(HOME));
    await userEvent.click(dialog().getByRole('button', { name: 'Cruiser' }));
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    expect(screen.getByText('Cruiser +1')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^5/ }));
    await userEvent.click(dialog().getByRole('button', { name: 'Cruiser' }));
    expect(entries()[0]).toMatchObject({ delta: { units: { units: { cruiser: 2 } } } });
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear the system' }));
    expect(entries()[0]).toMatchObject({ delta: { units: undefined } });
    expect(screen.getByRole('button', { name: 'Choose on the map' })).toBeVisible();
  });

  test('a unit given and taken back leaves nothing', async () => {
    await openAdjustment();
    await userEvent.click(screen.getByRole('button', { name: 'Choose on the map' }));
    await userEvent.click(tile(HOME));
    await userEvent.click(dialog().getByRole('button', { name: 'Fighter' }));
    await userEvent.click(dialog().getByRole('button', { name: /^Fighter ×/ }));
    expect(entries()[0]).toMatchObject({ delta: { units: { systemId: HOME, units: {} } } });
  });

  test('a warning stands in its system block', async () => {
    await openAdjustment();
    await userEvent.click(screen.getByRole('button', { name: 'Choose on the map' }));
    await userEvent.click(tile(WAY));
    await userEvent.click(dialog().getByRole('button', { name: 'Close' }));
    act(() => useGame.getState().updateEntry(entries()[0].id, { delta: { units: { systemId: WAY, units: { cruiser: -1 } } } }));
    expect(screen.getByText(/is missing 1 × Cruiser/).closest('.editor-section')).toHaveTextContent('System');
  });

  test('undo that removes it closes the menu', async () => {
    await openAdjustment();
    act(() => useGame.getState().removeEntry(entries()[0].id));
    expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  });
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

test('undo of creating the status entry removes it and closes its fields, and the button is back', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  expect(entries().filter(e => e.type === 'statusTokens')).toHaveLength(1);
  expect(screen.getByRole('group', { name: 'Token distribution' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(entries().filter(e => e.type === 'statusTokens')).toHaveLength(0);
  expect(screen.queryByRole('group', { name: 'Token distribution' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Tokens and points' })).toBeVisible();
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
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
});

test('Add action stands in the Actions section, in the block that sticks to the bottom of the panel', () => {
  render(<PlanScreen />);
  expect(phase('Actions').getByRole('button', { name: 'Add action' }).closest('.phase-add')).not.toBeNull();
});

test('the shop opens on the active system and shows the price of each unit', async () => {
  await chooseSystem(HOME);
  await userEvent.click(screen.getByRole('button', { name: /^Production / }));
  const shop = within(screen.getByRole('dialog'));
  expect(shop.getByRole('heading', { level: 2, name: 'Production' })).toBeVisible();
  expect(shop.queryByRole('group', { name: 'Mode' })).toBeNull();
  expect(shop.getByRole('button', { name: 'Cruiser' })).toHaveTextContent('2');
  expect(shop.getByRole('button', { name: 'Fighter' })).toHaveTextContent('½');
});

test('a status Stepper adds beyond 2 and warns, naming abilities; «−» takes the tokens back', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Tokens and points' }));
  const row = within(screen.getByRole('listitem', { name: 'Tokens and points' }));
  expect(row.queryByRole('button', { name: 'Reset' })).toBeNull();
  expect(row.getByRole('button', { name: 'Remove one Tactic' })).toBeDisabled();
  for (let i = 0; i < 2; i += 1) await userEvent.click(row.getByRole('button', { name: 'Add one Tactic' }));
  expect(row.queryByText(/usually from abilities/)).toBeNull();
  await userEvent.click(row.getByRole('button', { name: 'Add one Tactic' }));
  expect(entries()[0]).toMatchObject({ tactic: 3 });
  expect(cell('Tactic')).toHaveTextContent('3 → 6');
  expect(row.getByText(/usually from abilities/)).toBeVisible();
  for (let i = 0; i < 3; i += 1) await userEvent.click(row.getByRole('button', { name: 'Remove one Tactic' }));
  expect(entries()[0]).toMatchObject({ tactic: 0 });
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
  await userEvent.click(screen.getByTestId('drawer-scrim'));
  expect(screen.queryByRole('group', { name: 'Player 1' })).toBeNull();
});

describe('the drawers', () => {
  test('players and the legend hang on tabs and close on a tap outside or on Escape', async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Players' }));
    expect(screen.getByRole('heading', { name: 'Players' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.click(screen.getByTestId('drawer-scrim'));
    expect(screen.queryByRole('heading', { name: 'Players' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Legend' }));
    const legend = screen.getByRole('dialog', { name: 'Legend' });
    for (const name of ['Flagship', 'War Sun', 'Dreadnought', 'Carrier', 'Cruiser', 'Destroyer', 'Fighter', 'Infantry', 'Mech', 'PDS', 'Space dock']) expect(legend).toHaveTextContent(name);
    expect(legend).toHaveTextContent('Dashed');
    expect(legend).toHaveTextContent('now → forecast');
    expect(legend.querySelectorAll('[data-unit]')).toHaveLength(11);
    // The planets are drawn as the map draws them, with their trait and technology.
    expect(legend.querySelectorAll('.tile .planet .planet-disc')).toHaveLength(3);
    expect(legend.querySelector('.planet-tech-cybernetic')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Legend' })).toBeNull();
  });

  test('a right drawer leaves the map and the plan at hand, and only its tab closes it', async () => {
    render(<PlanScreen />);
    const tab = () => screen.getByRole('button', { name: /Ship upgrades/ });
    await userEvent.click(tab());
    expect(screen.queryByTestId('drawer-scrim')).toBeNull();
    await userEvent.click(tile(TARGET));
    expect(screen.getByRole('dialog', { name: 'Ship upgrades' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Tile 25' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    expect(screen.getByRole('button', { name: 'Tactical action' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Ship upgrades' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Ship upgrades' })).toBeVisible();
    await userEvent.click(tab());
    expect(screen.queryByRole('dialog', { name: 'Ship upgrades' })).toBeNull();
  });

  test('the strip over the map keeps only what acts on the map', () => {
    render(<PlanScreen />);
    const strip = document.querySelector('.map-strip') as HTMLElement;
    expect(within(strip).queryByRole('button', { name: 'Players' })).toBeNull();
    expect(within(strip).queryByRole('button', { name: /Ship upgrades/ })).toBeNull();
    expect(within(strip).queryByRole('button', { name: 'Forecast' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Rounds' }).parentElement!).getByRole('button', { name: 'Forecast' })).toBeVisible();
    expect(within(document.querySelector('.drawer-rail-right') as HTMLElement).getByRole('button', { name: /Ship upgrades/ })).toBeVisible();
  });
});

test('reading a setup entry lights its system, and closing it puts the light out', async () => {
  useGame.getState().changeAdjustment(1, { kind: 'setup', systemId: TARGET, unit: 'cruiser', planetId: null, amount: 1 });
  render(<PlanScreen />);
  const label = screen.getByRole('button', { name: /^Setup/ });
  expect(tile(TARGET)).not.toHaveClass('tile-active');
  await userEvent.click(label);
  expect(tile(TARGET)).toHaveClass('tile-active');
  await userEvent.click(label);
  expect(tile(TARGET)).not.toHaveClass('tile-active');
});

describe('one slot of the panel, one head for every editor', () => {
  const panel = () => document.querySelector('.plan-panel') as HTMLElement;

  test('the choice of a system has only the cross; the editor has «Done» and a cross that removes the action', async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    expect(within(panel()).getByRole('heading', { name: 'Tactical action' })).toBeVisible();
    expect(within(panel()).queryByRole('button', { name: 'Done' })).toBeNull();
    await userEvent.click(tile(TARGET));
    expect(within(panel()).getAllByRole('heading', { level: 2 })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Remove action' }));
    expect(entries()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Add action' })).toBeVisible();
  });

  test('the flight is a step: only it shows, «Back» returns, its cross removes the route; the source row opens it again', async () => {
    await chooseSystem();
    await addRouteByTaps(HOME, TARGET);
    expect(within(panel()).getByRole('heading', { name: 'Flight 5 → 25' })).toBeVisible();
    expect(within(panel()).queryByText('Sources')).toBeNull();
    expect(within(panel()).queryByRole('button', { name: 'Done' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(within(panel()).getByText('Sources')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^5/ }));
    expect(within(panel()).getAllByRole('button', { name: /^Remove/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Remove route' }));
    expect(tactical().moves).toEqual([]);
    expect(within(panel()).getByText('Sources')).toBeVisible();
  });

  test('the battle and the production are rows that say what they hold and open the big hex', async () => {
    await chooseSystem();
    expect(screen.getByRole('button', { name: 'Battle optional · Start a battle' })).toHaveClass('source-button');
    await userEvent.click(screen.getByRole('button', { name: 'Production optional · Open the shop' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    // Production of a tactical action places units only, and the hex offers nothing else (#5).
    expect(screen.queryByRole('group', { name: 'Mode' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'PDS' })).toBeNull();
  });

  test('the cross of the adjustment removes it', async () => {
    useGame.getState().addEntry(1, { type: 'adjustment', label: 'Card', delta: { tradeGoods: 2 } }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Manual adjustment/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove action' }));
    expect(entries()).toEqual([]);
  });

  test('the expedition of a turn opens as a step of its editor; the closed row reads out the part and the payment', async () => {
    useGame.getState().addEntry(1, { type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: 'res5', payment: { planets: ['nestphar'], tradeGoods: 1 } }] }, 'action');
    render(<PlanScreen />);
    const row = () => screen.getByRole('listitem', { name: /^Component action/ });
    expect(row()).toHaveTextContent('+ Expedition: 5 resources · Nestphar, trade goods 1');
    await userEvent.click(within(row()).getByRole('button', { name: /^Edit: / }));
    await userEvent.click(screen.getByRole('button', { name: /^\+ Expedition:/ }));
    expect(within(panel()).getByRole('heading', { name: 'Expedition' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Expedition part' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('group', { name: 'In this turn' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^\+ Expedition:/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove action' }));
    expect(JSON.stringify(entries())).not.toContain('expedition');
    expect(entries()).toHaveLength(1);
  });

});

test('the Diplomacy primary puts every other player\'s command token on the chosen system of the map (#7)', () => {
  useGame.getState().setStrategyCard(1, 2);
  useGame.getState().setStrategyCard(1, 2);
  useGame.getState().addEntry(1, { type: 'strategic', card: 2, effects: { systemId: HOME } }, 'action');
  render(<PlanScreen />);
  expect(within(tile(HOME) as HTMLElement).getAllByRole('img', { name: /Command token of/ })).toHaveLength(game().opponents.length);
});

test('the totals count commodities beside the trade goods (#7)', () => {
  useGame.getState().addEntry(1, { type: 'strategic', card: 5 }, 'action');
  render(<PlanScreen />);
  expect(cell('Commodities')).toHaveTextContent(`0 → ${pack.factions.arborec.commodities}`);
});

describe('acts inside an action in the plan list', () => {
  test('a turn shows its acts as lines under its name, without rows of their own', () => {
    const rival = game().opponents[0].id;
    useGame.getState().addEntry(1, {
      type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
      acts: [{ kind: 'transaction', with: rival, give: { tradeGoods: 2 }, get: {} }, { kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }],
    }, 'action');
    render(<PlanScreen />);
    const row = screen.getByRole('listitem', { name: /^Tactical action/ });
    expect(row).toHaveTextContent('+ Transaction with Player 2: give trade goods 2; get nothing');
    expect(row).toHaveTextContent('+ Expedition: 3 trade goods');
    expect(screen.getAllByRole('listitem').filter(li => li.matches('.entry'))).toHaveLength(1);
  });

  test('Warfare\'s free tactical action shows under its card, with no row or number of its own', () => {
    const card = useGame.getState().addEntry(1, { type: 'strategic', card: 6 }, 'action');
    useGame.getState().addEntry(1, { type: 'tactical', systemId: TARGET, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, free: true, fromCard: card }, 'action');
    useGame.getState().addEntry(1, { type: 'tactical', systemId: HOME, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    render(<PlanScreen />);
    const rows = screen.getAllByRole('listitem').filter(li => li.matches('.entry'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('+ Tactical action without a token · 25');
    expect(within(rows[1]).getByText('1')).toBeInTheDocument();
  });
});

describe('the acts of a turn in its editor', () => {
  test('a pass opens a turn editor with «In this turn»; a transaction opens its step and comes back', async () => {
    useGame.getState().addEntry(1, { type: 'pass' }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit: Pass' }));
    const block = () => within(screen.getByRole('group', { name: 'In this turn' }));
    await userEvent.click(block().getByRole('button', { name: '+ Transaction' }));
    expect(screen.getByRole('heading', { name: 'Transaction' })).toBeVisible();
    await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: 'Add one Trade goods' }));
    expect(entries()[0]).toMatchObject({ acts: [{ kind: 'transaction', give: { tradeGoods: 1 } }] });
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(block().getByRole('button', { name: /^\+ Transaction with Player 2: give trade goods 1/ })).toBeVisible();
  });

  test('the tactical editor ends with «In this turn»', async () => {
    await chooseSystem();
    expect(screen.getByRole('group', { name: 'In this turn' })).toBeVisible();
  });

  test('the pencil of a component action opens the turn editor, with its note', async () => {
    useGame.getState().addEntry(1, { type: 'component', note: 'Plague' }, 'action');
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Edit: Component action/ }));
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('Plague');
    expect(screen.getByRole('group', { name: 'In this turn' })).toBeVisible();
  });
});

test('the turn editor of a pass shows what its expedition lacks, so no warning of the turn is lost', async () => {
  useGame.getState().addEntry(1, { type: 'pass', acts: [{ kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }] }, 'action');
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit: Pass' }));
  expect(within(document.querySelector('.editor-frame') as HTMLElement).getByText(/trade goods/i, { selector: '.warning-text' })).toBeVisible();
});
