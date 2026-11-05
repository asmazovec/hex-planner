import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import type { Game, GameState } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { HexMap } from './HexMap';
import { TileSheet } from './TileSheet';
import { layoutUnits, TileView } from './TileView';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

const emptyState = (): GameState => ({
  systems: {}, ground: {}, exhausted: [], control: {}, tokensOnMap: [],
  tradeGoods: 0, tactic: 3, fleet: 3, strategy: 2, vp: 0,
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

test('own and enemy units show counts; a single unit shows no number', () => {
  setup('25', (g, s) => {
    s.systems['1,0'] = { carrier: 2, destroyer: 1 };
    g.enemyUnits['1,0'] = { dreadnought: 3 };
  });
  expect(screen.getByLabelText('Carrier ×2')).toHaveTextContent('2');
  expect(screen.getByLabelText('Destroyer ×1')).not.toHaveTextContent(/\d/);
  expect(screen.getByLabelText('Dreadnought ×3 (enemy)')).toHaveTextContent('3');
});

test('ground units sit with their planet', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (_g, s) => { s.ground[id] = { infantry: 4, mech: 1 }; });
  const group = screen.getByLabelText(new RegExp(`^${pack.planets[id].name}:`));
  expect(within(group).getByLabelText('Infantry ×4')).toBeInTheDocument();
  expect(within(group).getByLabelText('Mech ×1')).toBeInTheDocument();
});

test('shows a command token and a space dock marker', () => {
  const id = pack.tiles['25'].planetIds[0];
  setup('25', (g, s) => { s.tokensOnMap.push('1,0'); g.docks.push(id); });
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

test('an unknown tile does not break the map', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  game.map['1,0'] = '9999';
  render(<HexMap game={game} state={emptyState()} pack={pack} />);
  expect(document.querySelectorAll('.tile')).toHaveLength(37);
  expect(screen.getByLabelText('Unknown tile 9999')).toBeInTheDocument();
});

test('the sheet edits dock, control and enemy units', async () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
  const game = useGame.getState().game!;
  game.map['1,0'] = '25';
  const planetId = pack.tiles['25'].planetIds[0];
  const planet = pack.planets[planetId];
  const state = emptyState();
  render(<TileSheet slotKey="1,0" pack={pack} game={game} state={state} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Space dock' }));
  expect(useGame.getState().game!.docks).toContain(planetId);
  await userEvent.click(within(screen.getByRole('group', { name: `Control of ${planet.name}` })).getByRole('button', { name: 'Enemy' }));
  expect(useGame.getState().game!.planetControl[planetId]).toBe('enemy');
  await userEvent.click(screen.getByRole('button', { name: 'Add one Cruiser' }));
  expect(useGame.getState().game!.enemyUnits['1,0']).toEqual({ cruiser: 1 });
});

test('unit stacks stay inside the hex for any number of stacks and planets', () => {
  const inside = (x: number, y: number) => Math.abs(y) <= (58.5 * Math.sqrt(3)) / 2 && Math.abs(x) <= 58.5 - Math.abs(y) / Math.sqrt(3);
  for (const planets of [0, 1, 2, 3]) {
    for (let n = 1; n <= 18; n += 1) {
      const { scale, cells } = layoutUnits(n, planets);
      expect(cells).toHaveLength(n);
      for (const c of cells) {
        for (const [dx, dy] of [[-15, -8], [15, -8], [-15, 8], [15, 8]]) {
          expect(inside(c.x + dx * scale, c.y + dy * scale), `n=${n} planets=${planets}`).toBe(true);
        }
      }
    }
  }
});

/** Numbers from a transform such as translate(1 2) scale(3). */
const moved = (g: Element) => {
  const [x = 0, y = 0, scale = 1] = (g.getAttribute('transform') ?? '').match(/-?[\d.]+/g)?.map(Number) ?? [];
  return { x, y, scale };
};

test.each(['25', '26', '27', '28', '16'])('ground units on tile %s stay in the hex, clear of the space stacks', id => {
  const inside = (x: number, y: number) => Math.abs(y) <= (58.5 * Math.sqrt(3)) / 2 && Math.abs(x) <= 58.5 - Math.abs(y) / Math.sqrt(3);
  setup(id, (_g, s) => {
    for (const planet of pack.tiles[id].planetIds) s.ground[planet] = { infantry: 4, mech: 2 };
    s.systems['1,0'] = { carrier: 2, cruiser: 2 };
  });
  const ground = [...document.querySelectorAll('.planet [data-unit]')].map(glyph => {
    const planet = moved(glyph.closest('.planet')!);
    const own = moved(glyph.parentElement!);
    const s = own.scale;
    // The silhouette and its count badge, with the badge at the lower right.
    return { left: planet.x + own.x - 10.5 * s, right: planet.x + own.x + 17.1 * s, top: planet.y + own.y - 7 * s, bottom: planet.y + own.y + 12 * s };
  });
  expect(ground.length).toBe(pack.tiles[id].planetIds.length * 2);
  for (const box of ground) {
    for (const [x, y] of [[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]]) {
      expect(inside(x, y), `tile ${id}: ground corner ${x},${y}`).toBe(true);
    }
  }
  const stacks = [...document.querySelectorAll('.tile > g > g > [data-unit]')].filter(glyph => !glyph.closest('.planet')).map(glyph => {
    const cell = moved(glyph.parentElement!.parentElement!);
    return { left: cell.x - 15 * cell.scale, right: cell.x + 15 * cell.scale, top: cell.y - 8 * cell.scale, bottom: cell.y + 12 * cell.scale };
  });
  expect(stacks.length).toBe(2);
  for (const a of ground) for (const b of stacks) {
    const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
    expect(apart, `tile ${id}: ground ${JSON.stringify(a)} against stack ${JSON.stringify(b)}`).toBe(true);
  }
});

test('the tile number stays inside the hex and clear of planets and markers', () => {
  const half = (58.5 * Math.sqrt(3)) / 2;
  for (const id of ['46', '25', '26', '16']) {
    setup(id, (_g, st) => { st.tokensOnMap.push('1,0'); }, { ingress: true });
    const baseline = Number(document.querySelector('.tile-number')!.getAttribute('y'));
    // A box wide enough for four digits, from the cap height to just under the baseline.
    const box = { left: -16, right: 16, top: baseline - 11, bottom: baseline + 1 };
    expect(box.top, `tile ${id} inside the hex`).toBeGreaterThan(-half);
    const centre = (g: Element) => g.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number);
    const discs = [...document.querySelectorAll('.planet')].map(g => {
      const [x, y] = centre(g);
      return { x, y, r: Number(g.querySelector('circle')!.getAttribute('r')) };
    });
    const markers = [screen.getByLabelText('Command token'), screen.getByLabelText('Ingress token')].map(g => {
      const [x, y] = centre(g);
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

test('the sheet and the map name units in the interface language', () => {
  setLanguage('ru');
  const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  game.map['1,0'] = '25';
  const state = { ...emptyState(), systems: { '1,0': { warsun: 1 } } };
  render(<TileSheet slotKey="1,0" pack={pack} game={game} state={state} />);
  expect(screen.getByText('Солнце войны')).toBeVisible();
  expect(screen.queryByText('War Sun')).toBeNull();
  render(<svg><TileView slotKey="1,0" pack={pack} game={game} state={state} /></svg>);
  expect(screen.getByRole('img', { name: 'Солнце войны ×1' })).toBeInTheDocument();
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
