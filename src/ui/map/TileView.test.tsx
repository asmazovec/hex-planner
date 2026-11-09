import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { hexLayout } from '../../domain/hexLayout';
import { createGame } from '../../domain/newGame';
import type { Game, GameState } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { seatSlots } from '../../domain/mapBuilder';
import { HexMap } from './HexMap';
import { TileView } from './TileView';

vi.mock('../../domain/hexLayout', async original => {
  const actual = await original<typeof import('../../domain/hexLayout')>();
  return { ...actual, hexLayout: vi.fn(actual.hexLayout) };
});

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

const emptyState = (): GameState => ({
  systems: {}, ground: {}, exhausted: [], control: {}, tokensOnMap: [],
  tradeGoods: 0, commodities: 0, tactic: 3, fleet: 3, strategy: 2, vp: 0, opponentVp: {}, upgrades: [], docks: [], pds: {},
});

function setup(
  mapValue: string | undefined, edit: (game: Game, state: GameState) => void = () => undefined,
  props: Partial<Parameters<typeof TileView>[0]> = {},
) {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  const state = emptyState();
  if (mapValue) game.map['1,0'] = mapValue; else delete game.map['1,0'];
  edit(game, state);
  return render(
    <svg><TileView slotKey="1,0" pack={pack} game={game} state={state} {...props} /></svg>,
  );
}

test('shows the tile number and each planet with resources and influence', () => {
  setup('25');
  const planet = pack.planets[pack.tiles['25'].planetIds[0]];
  expect(screen.getByText('25')).toBeInTheDocument();
  const group = screen.getByLabelText(new RegExp(`^${planet.name}:`));
  expect(group.querySelector('.planet-values')).toHaveTextContent(`${planet.resources}/${planet.influence}`);
});

test('a planet shows who controls it and whether it is exhausted', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (_g, s) => { s.control[id] = 'me'; s.exhausted.push(id); });
  const group = screen.getByLabelText(new RegExp(`^${pack.planets[id].name}:`));
  expect(group).toHaveAttribute('data-control', 'me');
  expect(group).toHaveAttribute('data-exhausted', 'true');
  expect(group.getAttribute('aria-label')).toMatch(/exhausted/);
});

test('an enemy planet and a free planet are told apart', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (_g, s) => { s.control[id] = 'enemy'; });
  const group = screen.getByLabelText(new RegExp(`^${pack.planets[id].name}:`));
  expect(group).toHaveAttribute('data-control', 'enemy');
  expect(group).toHaveAttribute('data-exhausted', 'false');
});

test('an enemy planet is ringed in its owner\'s colour and names the owner', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => {
    g.opponents[1].faction = 'hacan'; g.opponents[1].color = 5;
    s.control[id] = 'enemy'; g.planetOwner[id] = g.opponents[1].id;
  });
  const group = screen.getByLabelText(new RegExp(`^${pack.planets[id].name}:`));
  expect((group.querySelector('.planet-disc') as SVGElement).style.stroke).toBe('var(--player-5)');
  expect(group.getAttribute('aria-label')).toContain(`enemy (${pack.factions.hacan.name})`);
});

test('own and enemy units show counts; a single unit shows no number', () => {
  setup('25', (g, s) => {
    s.systems['1,0'] = { carrier: 2, destroyer: 1 };
    g.enemyUnits['1,0'] = { [g.opponents[0].id]: { dreadnought: 3 } };
  });
  expect(screen.getByLabelText('Carrier ×2')).toHaveTextContent('2');
  expect(screen.getByLabelText('Destroyer ×1')).not.toHaveTextContent(/\d/);
  expect(screen.getByLabelText('Dreadnought ×3 (Player 2)')).toHaveTextContent('3');
});

/** Numbers from a CSS transform such as translate(1px,2px) scale(3). */
const placed = (node: Element) => {
  const [x = 0, y = 0, scale = 1] = ((node as SVGElement).style.transform.match(/-?[\d.]+/g) ?? []).map(Number);
  return { x, y, scale };
};
const stackOf = (label: string) => screen.getByLabelText(label).closest('[data-stack]')!;
const PLANET_BASE = 10;

test.each(['25', '26', '16'])('ground units on tile %s stand on the arc of their planet', id => {
  const ids = pack.tiles[id].planetIds;
  setup(id, (_g, s) => { for (const planet of ids) s.ground[planet] = { infantry: 4, mech: 2 }; });
  const discs = [...document.querySelectorAll('.planet')].map(placed);
  const stacks = [...document.querySelectorAll('[data-stack]')];
  expect(stacks).toHaveLength(ids.length * 2);
  for (const stack of stacks) {
    const disc = discs[Number(stack.getAttribute('data-planet'))];
    const token = placed(stack);
    const size = token.scale * 100;
    expect(Math.hypot(token.x - disc.x, token.y - disc.y)).toBeCloseTo(disc.scale * PLANET_BASE + size * 0.54 + 58.5 / 53, 0);
  }
});

test('a space dock is a token on the arc of its planet, in my colour', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => { g.color = 4; s.docks.push(id); s.ground[id] = { infantry: 1 }; });
  const dock = stackOf('Space dock');
  expect(dock).toHaveAttribute('data-planet', '0');
  expect(dock.querySelector('rect')).toHaveAttribute('stroke', '#74d09a');
});

test('a space dock takes the colour of its owner, and is mine on a free planet', () => {
  const id = pack.tiles['25'].planetIds[0];
  const dockOn = (control: 'me' | 'enemy' | undefined) => {
    cleanup();
    setup('25', (g, s) => {
      g.color = 1; g.opponents[0].color = 3;
      // An opponent's structures are in their own count, mine in mine.
      if (control === 'enemy') s.rivals = { [g.opponents[0].id]: { ...emptyState(), docks: [id] } };
      else s.docks.push(id);
      if (control) s.control[id] = control;
    });
  };
  dockOn('enemy');
  expect(stackOf('Space dock (Player 2)').querySelector('rect')).toHaveAttribute('stroke', '#ea7f76');
  dockOn('me');
  expect(stackOf('Space dock').querySelector('rect')).toHaveAttribute('stroke', '#7fb2ff');
  dockOn(undefined);
  expect(stackOf('Space dock').querySelector('rect')).toHaveAttribute('stroke', '#7fb2ff');
});

test('a space dock on an enemy planet takes the colour of its owner and names the faction', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => {
    g.opponents[2].faction = 'hacan'; g.opponents[2].color = 6; s.rivals = { [g.opponents[2].id]: { ...emptyState(), docks: [id] } };
    s.control[id] = 'enemy'; g.planetOwner[id] = g.opponents[2].id;
  });
  expect(stackOf(`Space dock (${pack.factions.hacan.name})`).querySelector('rect')).toHaveAttribute('stroke', '#f0a463');
});

test('an owner left on a planet that is mine in the plan does not colour its dock', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => {
    g.opponents[2].color = 6; s.docks.push(id);
    s.control[id] = 'me'; g.planetOwner[id] = g.opponents[2].id;
  });
  expect(stackOf('Space dock').querySelector('rect')).toHaveAttribute('stroke', '#7fb2ff');
});

test('every token takes the colour of its owner, and two opponents of the same type stay separate tokens', () => {
  setup('25', (g, s) => {
    g.color = 1;
    g.opponents[0].color = 3; g.opponents[1].color = 5;
    g.opponents[1].faction = 'hacan';
    s.systems['1,0'] = { carrier: 1 };
    g.enemyUnits['1,0'] = { [g.opponents[0].id]: { cruiser: 2 }, [g.opponents[1].id]: { cruiser: 1 } };
  });
  expect(stackOf('Carrier ×1').querySelector('circle')).toHaveAttribute('stroke', '#7fb2ff');
  expect(stackOf('Cruiser ×2 (Player 2)').querySelector('circle')).toHaveAttribute('stroke', '#ea7f76');
  expect(stackOf(`Cruiser ×1 (${pack.factions.hacan.name})`).querySelector('circle')).toHaveAttribute('stroke', '#b89bf5');
  expect(document.querySelectorAll('[data-stack]')).toHaveLength(3);
});

test('opponents stand in seat order, not list order', () => {
  const xOf = (label: string) => placed(stackOf(label)).x;
  setup('39', (g) => {
    g.opponents[0].seat = 3; g.opponents[1].seat = 2;
    g.enemyUnits['1,0'] = { [g.opponents[0].id]: { cruiser: 1 }, [g.opponents[1].id]: { carrier: 1 } };
  });
  expect(xOf('Carrier ×1 (Player 3)')).toBeLessThan(xOf('Cruiser ×1 (Player 2)'));
});

test('units under an id nobody has are not drawn', () => {
  setup('25', (g) => { g.enemyUnits['1,0'] = { gone: { cruiser: 1 } }; });
  expect(document.querySelectorAll('[data-stack]')).toHaveLength(0);
});

test('enemy ground units stand on the arc of the first planet, or on the comb without planets', () => {
  setup('26', (g) => { g.enemyUnits['1,0'] = { [g.opponents[0].id]: { infantry: 2 } }; });
  expect(stackOf('Infantry ×2 (Player 2)')).toHaveAttribute('data-planet', '0');
  cleanup();
  setup('39', (g) => { g.enemyUnits['1,0'] = { [g.opponents[0].id]: { mech: 1 } }; });
  expect(stackOf('Mech ×1 (Player 2)')).not.toHaveAttribute('data-planet');
});

test('Thunder\'s Edge beside three planets draws all four instead of breaking the map', () => {
  const tePack = loadPack(['pok', 'te']);
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, tePack);
  game.map['1,0'] = '16';
  game.expedition.thundersEdgeSystem = '1,0';
  render(<svg><TileView slotKey="1,0" pack={tePack} game={game} state={emptyState()} /></svg>);
  expect(tePack.tiles['16'].planetIds).toHaveLength(3);
  const discs = [...document.querySelectorAll('.planet')].map(placed);
  expect(discs).toHaveLength(4);
  for (const disc of discs) expect(Math.abs(disc.y) + disc.scale * PLANET_BASE).toBeLessThan(50.6);
});

test('with a command token, an ingress and a seat badge no token stands on them', () => {
  const stacks = { flagship: 1, warsun: 1, dreadnought: 1, carrier: 1, cruiser: 1, destroyer: 1, fighter: 1 };
  setup('25', (g, s) => { s.tokensOnMap.push('1,0'); s.systems['1,0'] = stacks; g.enemyUnits['1,0'] = { [g.opponents[0].id]: stacks }; }, { ingress: true, seat: { number: 2, color: 2 } });
  const centres = ['Command token', 'Ingress token', 'Seat 2'].map(name => {
    const [x, y] = screen.getByLabelText(name).getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number);
    return { name, x, y };
  });
  const tokens = [...document.querySelectorAll('[data-stack]')].map(placed);
  expect(tokens).toHaveLength(14);
  for (const { name, x, y } of centres) {
    for (const token of tokens) expect(Math.hypot(token.x - x, token.y - y), name).toBeGreaterThanOrEqual(4.6);
  }
});

test('a command token only takes room while it is drawn', () => {
  const units = { carrier: 1, cruiser: 1, destroyer: 1, fighter: 1, flagship: 1, dreadnought: 1, warsun: 1 };
  const enemy = { carrier: 1 };
  const positions = () => [...document.querySelectorAll('[data-stack]')].map(n => (n as SVGElement).style.transform);
  setup('25', (g, s) => { s.systems['1,0'] = units; g.enemyUnits['1,0'] = { [g.opponents[0].id]: enemy }; });
  const without = positions();
  cleanup();
  setup('25', (g, s) => { s.systems['1,0'] = units; g.enemyUnits['1,0'] = { [g.opponents[0].id]: enemy }; s.tokensOnMap.push('1,0'); });
  expect(positions()).not.toEqual(without);
});

test('the layout is worked out again only when the stacks change', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  game.map['1,0'] = '25';
  const view = (state: GameState) => <svg><TileView slotKey="1,0" pack={pack} game={game} state={state} /></svg>;
  const { rerender } = render(view({ ...emptyState(), systems: { '1,0': { carrier: 1 } } }));
  const calls = vi.mocked(hexLayout).mock.calls.length;
  rerender(view({ ...emptyState(), tradeGoods: 9, systems: { '1,0': { carrier: 1 } } }));
  expect(vi.mocked(hexLayout).mock.calls.length).toBe(calls);
  rerender(view({ ...emptyState(), systems: { '1,0': { carrier: 2 } } }));
  expect(vi.mocked(hexLayout).mock.calls.length).toBe(calls + 1);
});

test('a planet name goes when a token covers it, and stays otherwise', () => {
  const id = pack.tiles['25'].planetIds[0];
  const name = pack.planets[id].name;
  setup('25', (_g, s) => { s.systems['1,0'] = { carrier: 1 }; });
  expect(screen.getByText(name)).toBeInTheDocument();
  cleanup();
  // The arc starts right under the planet.
  setup('25', (_g, s) => { s.ground[id] = { infantry: 1 }; });
  expect(screen.queryByText(name)).toBeNull();
});

test('a caption goes when a token covers it', () => {
  setup('42');
  expect(screen.getByText('Nebula')).toBeInTheDocument();
  cleanup();
  setup('42', (_g, s) => { s.systems['1,0'] = { carrier: 1, cruiser: 1, destroyer: 1, fighter: 1, flagship: 1, dreadnought: 1, warsun: 1 }; });
  expect(screen.queryByText('Nebula')).toBeNull();
});

test('stacks stay the same nodes when they move, new ones grow in and removed ones collapse', () => {
  vi.useFakeTimers();
  try {
    const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
    game.map['1,0'] = '25';
    const view = (systems: GameState['systems']) => <svg><TileView slotKey="1,0" pack={pack} game={game} state={{ ...emptyState(), systems }} /></svg>;
    const { rerender } = render(view({ '1,0': { carrier: 1 } }));
    const carrier = stackOf('Carrier ×1');
    expect(carrier).toHaveClass('tk');
    expect(carrier.firstElementChild).not.toHaveClass('tk-in');
    const before = (carrier as SVGElement).style.transform;

    rerender(view({ '1,0': { carrier: 1, fighter: 2 } }));
    expect(stackOf('Carrier ×1')).toBe(carrier);
    expect((carrier as SVGElement).style.transform).not.toBe(before);
    expect(stackOf('Fighter ×2').firstElementChild).toHaveClass('tk-in');

    rerender(view({ '1,0': { carrier: 1 } }));
    const leaving = document.querySelector('[data-stack="me|fighter|-"]')!;
    expect(leaving.firstElementChild).toHaveClass('tk-out');
    expect(screen.queryByLabelText('Fighter ×2')).toBeNull();
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector('[data-stack="me|fighter|-"]')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('a home system shows the seat number of its player in the colour of that player', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  game.opponents[0].color = 7;
  const [seat1, seat2] = seatSlots(6, pack, game.layout);
  game.map[seat1] = '1';
  game.map[seat2] = '2';
  game.map['1,0'] = '25';
  render(<HexMap game={game} state={emptyState()} pack={pack} />);
  expect(within(document.querySelector(`[data-slot="${seat1}"]`)!).getByLabelText('Seat 1').querySelector('circle')!.style.fill).toBe('var(--player-1)');
  expect(within(document.querySelector(`[data-slot="${seat2}"]`)!).getByLabelText('Seat 2').querySelector('circle')!.style.fill).toBe('var(--player-7)');
  expect(within(document.querySelector('[data-slot="1,0"]')!).queryByLabelText(/^Seat/)).toBeNull();
});

test('shows a command token and a space dock marker', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (_, s) => { s.tokensOnMap.push('1,0'); s.docks.push(id); });
  expect(screen.getByLabelText('Command token')).toBeInTheDocument();
  expect(screen.getByLabelText('Space dock')).toBeInTheDocument();
});

test('an unknown tile draws an empty hex with a warning', () => {
  setup('9999');
  expect(screen.getByLabelText(/Unknown tile 9999/)).toBeInTheDocument();
  expect(screen.queryByText('9999')).toBeInTheDocument();
});

test('an empty slot draws no warning', () => {
  setup(undefined);
  expect(screen.queryByLabelText(/Unknown tile/)).not.toBeInTheDocument();
});

test('a tap reports the slot key', async () => {
  const onTap = vi.fn();
  setup('25', undefined, { onTap });
  await userEvent.click(screen.getByRole('button'));
  expect(onTap).toHaveBeenCalledWith('1,0');
});

test('the map draws every slot of a six-player template, even with no tiles placed', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  render(<HexMap game={game} state={emptyState()} pack={pack} />);
  expect(document.querySelectorAll('.tile')).toHaveLength(37);
});

test('a PDS stands on its planet with its count, in the colour of its owner', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => { s.rivals = { [g.opponents[1].id]: { ...emptyState(), pds: { [id]: 2 } } }; g.planetOwner[id] = g.opponents[1].id; s.control[id] = 'enemy'; });
  expect(screen.getByRole('img', { name: 'PDS ×2 (Player 3)' })).toBeInTheDocument();
});

test('an unknown tile does not break the map', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  game.map['1,0'] = '9999';
  render(<HexMap game={game} state={emptyState()} pack={pack} />);
  expect(document.querySelectorAll('.tile')).toHaveLength(37);
  expect(screen.getByLabelText('Unknown tile 9999')).toBeInTheDocument();
});

test('the tile number stands small in the top-left corner, clear of planets and markers', () => {
  const half = (58.5 * Math.sqrt(3)) / 2;
  for (const id of ['46', '25', '26', '16']) {
    setup(id, (_g, st) => { st.tokensOnMap.push('1,0'); }, { ingress: true });
    const number = document.querySelector('.tile-number')!;
    expect(Number(number.getAttribute('font-size'))).toBe(7.5);
    const left = Number(number.getAttribute('x'));
    const baseline = Number(number.getAttribute('y'));
    expect(left).toBeLessThan(0);
    // A box wide enough for four digits, from the cap height to just under the baseline.
    const box = { left, right: left + 18, top: baseline - 6, bottom: baseline + 1 };
    expect(box.top, `tile ${id} inside the hex`).toBeGreaterThan(-half);
    expect(box.left, `tile ${id} inside the hex`).toBeGreaterThan(-(58.5 + box.top / Math.sqrt(3)));
    const discs = [...document.querySelectorAll('.planet')].map(g => {
      const { x, y, scale } = placed(g);
      return { x, y, r: PLANET_BASE * scale };
    });
    const markers = [screen.getByLabelText('Command token'), screen.getByLabelText('Ingress token')].map(g => {
      const [x, y] = g.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number);
      expect(x, 'in the right half').toBeGreaterThan(0);
      return { x, y, r: 8 };
    });
    for (const disc of [...discs, ...markers]) {
      const dx = disc.x - Math.max(box.left, Math.min(disc.x, box.right));
      const dy = disc.y - Math.max(box.top, Math.min(disc.y, box.bottom));
      expect(Math.hypot(dx, dy), `tile ${id}, disc at ${disc.x},${disc.y}`).toBeGreaterThanOrEqual(disc.r);
    }
    cleanup();
  }
});

test('a tile is tinted by what it holds', () => {
  const hexOf = (id: string) => { cleanup(); setup(id); return document.querySelector('.hex')!; };
  expect(hexOf('41')).toHaveClass('hex-anomaly');
  expect(hexOf('39')).toHaveClass('hex-wormhole');
  expect(hexOf('18')).toHaveClass('hex-mecatol');
  expect(hexOf('1')).toHaveClass('hex-home');
});

test('a planet shows its name, and a system without planets says what it is', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25');
  expect(screen.getByText(pack.planets[id].name)).toBeInTheDocument();
  cleanup();
  setup('42');
  expect(screen.getByText('Nebula')).toBeInTheDocument();
  cleanup();
  setup('39');
  expect(document.querySelector('.tile-number')).toHaveTextContent('39 α');
});

test('the wheel zooms without scrolling the page, and the reset button restores the view', async () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  render(<HexMap game={game} state={emptyState()} pack={pack} />);
  const svg = screen.getByRole('group', { name: 'Map' });
  const wheel = new WheelEvent('wheel', { deltaY: -200, cancelable: true, bubbles: true });
  act(() => { svg.dispatchEvent(wheel); });
  expect(wheel.defaultPrevented).toBe(true);
  const transform = () => svg.querySelector(':scope > g')!.getAttribute('transform');
  await waitFor(() => expect(transform()).not.toContain('scale(1)'));
  await userEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  await waitFor(() => expect(transform()).toBe('translate(0 0) scale(1)'));
});

const lanesOf = () => [...document.querySelectorAll('[data-lane]')].map(el => el.getAttribute('data-lane')).sort();

test('a hyperlane draws its lanes joining the edge pairs of the tile', () => {
  setup('83A');
  expect(lanesOf()).toEqual(['1-4']);
  expect(screen.getByLabelText('Tile 83')).toBeInTheDocument();
});

test('a hyperlane rotation moves every edge one step clockwise per turn', () => {
  cleanup();
  setup('83A@1');
  expect(lanesOf()).toEqual(['2-5']);
  cleanup();
  setup('83B@2');
  // 83B joins 0-2, 0-3 and 3-5; two turns give 2-4, 2-5 and 5-1.
  expect(lanesOf()).toEqual(['1-5', '2-4', '2-5']);
});

test('lane edges wrap around after the last edge', () => {
  setup('83A@5');
  // 1-4 turned five steps: 6 -> 0 and 9 -> 3.
  expect(lanesOf()).toEqual(['0-3']);
});

test('a lane of the tile is drawn through the hex, from the middle of one edge to the middle of another', () => {
  setup('83A');
  const path = document.querySelector('[data-lane="1-4"]')!;
  const d = path.getAttribute('d')!;
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  // Edge 1 is north-east, edge 4 south-west, so the line crosses the centre.
  expect(nums[0]).toBeGreaterThan(0);
  expect(nums[1]).toBeLessThan(0);
  expect(nums.at(-2)).toBeLessThan(0);
  expect(nums.at(-1)).toBeGreaterThan(0);
});

test('a hyperlane without edge data shows its id and rotation as text', () => {
  const teGame = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, loadPack(['pok', 'te']));
  teGame.map['1,0'] = '119A@2';
  render(<svg><TileView slotKey="1,0" pack={loadPack(['pok', 'te'])} game={teGame} state={emptyState()} /></svg>);
  expect(lanesOf()).toEqual([]);
  expect(screen.getByText('119A · 2')).toBeInTheDocument();
});

test('an ordinary system draws no lanes', () => {
  setup('25');
  expect(lanesOf()).toEqual([]);
});

test('a planet with a technology specialty shows a mark in that colour, and names it in its label', () => {
  const tile = Object.values(pack.tiles).find(t => t.planetIds.some(id => pack.planets[id].tech?.length === 1))!;
  const planet = pack.planets[tile.planetIds.find(id => pack.planets[id].tech?.length === 1)!];
  const tech = planet.tech![0];
  setup(tile.id);
  const group = screen.getByLabelText(new RegExp(`^${planet.name}:`));
  expect(group.getAttribute('aria-label')).toContain({ propulsion: 'Propulsion', biotic: 'Biotic', cybernetic: 'Cybernetic', warfare: 'Warfare' }[tech]);
  const mark = group.querySelector(`.planet-tech-${tech}`)!;
  expect(mark).not.toBeNull();
});

test('planets without a specialty have no mark', () => {
  const tile = Object.values(pack.tiles).find(t => t.planetIds.length > 0 && t.planetIds.every(id => !pack.planets[id].tech))!;
  setup(tile.id);
  expect(document.querySelector('[class*="planet-tech-"]')).toBeNull();
});

test('two marks on one planet stay off the values and off each other', () => {
  const full = loadPack(['pok', 'te']);
  const planet = Object.values(full.planets).find(p => (p.tech?.length ?? 0) === 2)!;
  const tile = Object.values(full.tiles).find(t => t.planetIds.includes(planet.id))!;
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, full);
  game.map['1,0'] = tile.id;
  render(<svg><TileView slotKey="1,0" pack={full} game={game} state={emptyState()} /></svg>);
  const group = screen.getByLabelText(new RegExp(`^${planet.name}:`));
  const marks = [...group.querySelectorAll('.planet-tech')].map(node => {
    const [x, y] = (node.getAttribute('transform')!.match(/-?[\d.]+/g) ?? []).map(Number);
    return { x, y };
  });
  expect(marks).toHaveLength(2);
  // The values text: about 15 wide for a digit pair, from just above the cap height to the baseline.
  const clearance = ({ x, y }: { x: number; y: number }) => Math.hypot(Math.max(Math.abs(x) - 7.5, 0), Math.max(-3.5 - y, 0));
  for (const mark of marks) expect(clearance(mark)).toBeGreaterThanOrEqual(4);
  expect(Math.hypot(marks[0].x - marks[1].x, marks[0].y - marks[1].y)).toBeGreaterThanOrEqual(6.5);
});

const full = loadPack(['pok', 'te']);

function renderFull(tileId: string, edit: (state: GameState) => void = () => undefined) {
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, full);
  game.map['1,0'] = tileId;
  const state = emptyState();
  edit(state);
  return render(<svg><TileView slotKey="1,0" pack={full} game={game} state={state} /></svg>);
}

const markCentre = (node: Element): { x: number; y: number } => {
  const [x, y] = (node.getAttribute('transform')!.match(/-?[\d.]+/g) ?? []).map(Number);
  return { x, y };
};

test('a legendary planet carries a gold mark on its upper left and says so in its label', () => {
  renderFull('66');
  const group = screen.getByLabelText(/^Hope's End:/);
  expect(group.getAttribute('aria-label')).toContain('legendary');
  const mark = group.querySelector('.planet-legendary')!;
  expect(mark).not.toBeNull();
  const { x, y } = markCentre(mark);
  expect(x).toBeLessThan(0);
  expect(y).toBeLessThan(0);
});

test('the legendary label is told in Russian too', () => {
  setLanguage('ru');
  renderFull('66');
  expect(screen.getByLabelText(/^Hope's End:/).getAttribute('aria-label')).toContain('легендарная');
});

test('an ordinary planet has no legendary mark', () => {
  setup('25');
  expect(document.querySelector('.planet-legendary')).toBeNull();
});

test('on Industrex the legendary mark, the technology mark and the values stay apart', () => {
  renderFull('115');
  const group = screen.getByLabelText(/^Industrex:/);
  const legendary = markCentre(group.querySelector('.planet-legendary')!);
  const tech = markCentre(group.querySelector('.planet-tech')!);
  expect(legendary.x).toBeLessThan(0);
  expect(tech.x).toBeGreaterThan(0);
  const clearance = ({ x, y }: { x: number; y: number }) => Math.hypot(Math.max(Math.abs(x) - 7.5, 0), Math.max(-3.5 - y, 0));
  expect(clearance(legendary)).toBeGreaterThanOrEqual(4);
  expect(clearance(tech)).toBeGreaterThanOrEqual(4);
  expect(Math.hypot(legendary.x - tech.x, legendary.y - tech.y)).toBeGreaterThanOrEqual(10);
});

test('a planet disc is tinted by its trait, a two-trait planet is split down the middle, and one without a trait stays neutral', () => {
  renderFull('66');
  expect(screen.getByLabelText(/^Hope's End:/).querySelectorAll('.planet-trait')).toHaveLength(1);
  expect(screen.getByLabelText(/^Hope's End:/).querySelector('.planet-trait-hazardous')).not.toBeNull();
  cleanup();
  renderFull('111');
  const two = screen.getByLabelText(/^Tarana:/);
  expect(two.querySelector('.planet-trait-cultural')).not.toBeNull();
  expect(two.querySelector('.planet-trait-industrial')).not.toBeNull();
  const [left, right] = [...two.querySelectorAll('.planet-trait')].map(node => node.getAttribute('d')!);
  expect(left).toContain('A');
  expect(left).not.toEqual(right);
  cleanup();
  renderFull('92');
  expect(screen.getByLabelText(/^Ordinian:/).querySelector('.planet-trait')).toBeNull();
});

test('control stays on the rim and an exhausted planet keeps its look with the tint on it', () => {
  renderFull('66', s => { s.control.hopesend = 'me'; s.exhausted.push('hopesend'); });
  const group = screen.getByLabelText(/^Hope's End:/);
  expect(group.querySelector('circle.planet-disc')).toHaveClass('planet-me');
  expect(group).toHaveClass('planet-exhausted');
  expect(group.querySelector('.planet-trait-hazardous')).not.toBeNull();
});


test('enemy ground units stand on the arc of their own planet, merged with any left in the system', () => {
  const [first, second] = pack.tiles['71'].planetIds;
  setup('71', g => {
    const [{ id }] = g.opponents;
    g.enemyGround = { [second]: { [id]: { infantry: 3 } }, [first]: { [id]: { infantry: 1 } } };
    g.enemyUnits['1,0'] = { [id]: { infantry: 1 } };
  });
  expect(stackOf('Infantry ×2 (Player 2)')).toHaveAttribute('data-planet', '0');
  expect(document.querySelectorAll('[data-stack$="|infantry|1"]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-stack$="|infantry|0"]')).toHaveLength(1);
});

test('a new reset signal sends the camera back to the whole map, as the reset button does', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  const { rerender } = render(<HexMap game={game} state={emptyState()} pack={pack} />);
  const svg = document.querySelector('.hexmap')!;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => undefined });
  const camera = () => svg.querySelector(':scope > g')!.getAttribute('transform');
  const start = camera();
  fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(svg, { pointerId: 1, clientX: 160, clientY: 100 });
  fireEvent.pointerUp(svg, { pointerId: 1, clientX: 160, clientY: 100 });
  expect(camera()).not.toBe(start);
  rerender(<HexMap game={game} state={emptyState()} pack={pack} resetSignal={1} />);
  expect(camera()).toBe(start);
  vi.unstubAllGlobals();
});

test('many command tokens pile up with overlap at the top right, clear of the tile number and the seat badge; mine lies on top', () => {
  setup('25', (g, s) => {
    s.tokensOnMap.push('1,0');
    s.rivals = Object.fromEntries(g.opponents.map(o => [o.id, { ...emptyState(), tokensOnMap: ['1,0'] }]));
  }, { seat: { number: 2, color: 2 } });
  const xOf = (el: Element) => Number(/translate\(([-\d.]+)/.exec(el.getAttribute('transform') ?? '')![1]);
  const tokens = [screen.getByRole('img', { name: 'Command token' }), ...screen.getAllByRole('img', { name: /^Command token of/ })];
  expect(tokens).toHaveLength(6);
  const seat = screen.getByRole('img', { name: /seat/i });
  const RADIUS = 6;
  const SEAT_RADIUS = 4.6;
  expect(Math.min(...tokens.map(xOf)) - RADIUS).toBeGreaterThanOrEqual(xOf(seat) + SEAT_RADIUS);
  // Mine is drawn last, so it lies on the pile.
  const all = [...document.querySelectorAll('[aria-label^="Command token"]')];
  expect(all.at(-1)).toBe(tokens[0]);
});
