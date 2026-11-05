import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import type { Game, GameState } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { HexMap } from './HexMap';
import { TileSheet } from './TileSheet';
import { TileView } from './TileView';

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
  edit(game, state);
  return render(
    <svg><TileView slotKey="1,0" mapValue={mapValue} pack={pack} game={game} state={state} {...props} /></svg>,
  );
}

test('shows the tile number and each planet with resources and influence', () => {
  setup('25');
  const planet = pack.planets[pack.tiles['25'].planetIds[0]];
  expect(screen.getByText('25')).toBeInTheDocument();
  const group = screen.getByLabelText(new RegExp(`^${planet.name}:`));
  expect(within(group).getByText(`${planet.resources}/${planet.influence}`)).toBeInTheDocument();
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
  render(<TileSheet slotKey="1,0" pack={pack} game={game} state={state} onClose={() => undefined} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Space dock' }));
  expect(useGame.getState().game!.docks).toContain(planetId);
  await userEvent.click(within(screen.getByRole('group', { name: `Control of ${planet.name}` })).getByRole('button', { name: 'Enemy' }));
  expect(useGame.getState().game!.planetControl[planetId]).toBe('enemy');
  await userEvent.click(screen.getByRole('button', { name: 'Add one Cruiser' }));
  expect(useGame.getState().game!.enemyUnits['1,0']).toEqual({ cruiser: 1 });
});
